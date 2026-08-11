/*#
# biome-plugin

The Babylon half of the procedural terrain shader (TERRAIN-SHADER-DESIGN.md):
a `MaterialPluginBase` that replaces the diffuse of the terrain material with
**world-space biome classification** — the GLSL mirror of [[biome-chart]]'s
pure, unit-tested model (one function per shader expression, same names).

This is build-order **step 1 + 3**: flat-colour biome cells (validate the
chart mapping before any texture), fBm axis noise + `edgeDither`, the slope
cliff override, and the photic cutoff sharing b3d-water's fog curve. The
array-atlas sampling (step 2) replaces `cellColour` with `TEXTURE_2D_ARRAY`
fetches later — the classification above it doesn't change.

Attach via [[b3d-terrain]]'s `biome="on"` attribute, or `attachBiomePlugin`
on any material for authored tiles. Being a plugin (not a ShaderMaterial),
scene lighting, shadows, and fog keep composing — the same reason
[[cloud-shadows]] is a plugin.
*/
/*{ "parent": "environment" }*/

import * as BABYLON from '@babylonjs/core'

/** Live-tunable parameters — mirrors BiomeChartConfig + the noise inventory. */
export interface BiomeParams {
  seaLevel: number
  baseTemperature: number
  lapseRate: number
  mapMoisture: number
  /** fBm scale/amplitude for the temperature + moisture axis noise. */
  tNoiseScale: number
  tNoiseAmp: number
  mNoiseScale: number
  mNoiseAmp: number
  /** High-frequency single-octave dither on the crossfade inputs. */
  ditherScale: number
  ditherAmp: number
  /** Slope override thresholds (cosine of the surface normal vs up). */
  cliffStart: number
  cliffFull: number
  /** Photic curve — MUST match the sibling b3d-water's fog attrs. */
  underwaterFog: number
  underwaterMurk: number
  /**
   * PLANETARY front-end (design step 7, promoted to GLSL): set `seaRadius > 0`
   * to switch the picker to radial altitude (`length(p − center) − seaRadius`),
   * radial-up slope, and insolation over asin-latitude with latWarp. 0 = flat
   * (Manta) front-end. Same chart, same overrides — only the axes change.
   */
  seaRadius: number
  planetCenter: { x: number; y: number; z: number }
  /** Equator-to-pole temperature swing (chart units). */
  insolation: number
  /** Low-frequency latitude domain-warp (gulf-stream wobble). */
  latWarpScale: number
  latWarpAmp: number
  /**
   * Detail breakup: high-frequency, LOW-contrast brightness noise layered on
   * the albedo (plus a slower octave for mid-distance), so flat-colour bands
   * read as surface rather than paint. The design doc's `detailBreakup`.
   */
  detailNoiseScale: number
  detailNoiseAmp: number
  /**
   * Surf/swash band depth (m): wave action bares the bottom this far below
   * the waterline — wet sand (rock on slopes), with coral/kelp establishing
   * only BELOW it. The beach → rock → coral sequence; 0 disables.
   */
  surfDepth: number
  /**
   * How much vegetation CLINGS to cliff faces in fecund (warm + wet) climates
   * — dither-driven pockets of the local biome breaking through the rock, the
   * way plants colonize cliff-sides anywhere life is rampant. 0 = always bare
   * rock; cold or dry climates stay bare regardless.
   */
  cliffCling: number
}

export const defaultBiomeParams = (): BiomeParams => ({
  seaLevel: 0,
  baseTemperature: 0.72,
  lapseRate: 0.004,
  mapMoisture: 0.45,
  tNoiseScale: 0.013,
  tNoiseAmp: 0.1,
  mNoiseScale: 0.02,
  mNoiseAmp: 0.18,
  ditherScale: 0.35,
  ditherAmp: 0.045,
  cliffStart: 0.7,
  cliffFull: 0.4,
  underwaterFog: 0.12,
  underwaterMurk: 0.08,
  seaRadius: 0,
  planetCenter: { x: 0, y: 0, z: 0 },
  insolation: 0.35,
  latWarpScale: 0.02,
  latWarpAmp: 0.12,
  detailNoiseScale: 0.55,
  detailNoiseAmp: 0.1,
  cliffCling: 0.55,
  surfDepth: 3,
})

/**
 * The flat-colour Whittaker chart, 4 cols (u: cold → warm) × **4 rows** (v:
 * dry land → wet land → marine), row-major from the dry row — organized so
 * ecological neighbours are chart neighbours. Tonio's transition spec, which
 * this layout encodes:
 *
 * - wet:    bottom muck → barren → coral → beach → forest → scrub → snow
 *   (the marine row + the wet-land row, joined at the beach — altitude reads
 *   the chart because the lapse maps altitude to temperature)
 * - medium: beach → steppe → lichen → ice
 * - dry:    beach → dune → barren rock → ice
 * - really cold: sea-level temperature starts at the cold end, so the
 *   beach→…→ice run COLLAPSES and ice meets the waterline — emergent from
 *   the lapse, not special-cased.
 *
 * Every land row ends in beach at the warm end (sea level = the temperature
 * peak), so the shoreline is beach in every climate that's warm enough.
 */
export const MANTA_PALETTE: number[][] = [
  // DEAD row (v = 0) — absolute zero moisture: complete barren even on the
  // flat, at ANY temperature. These are DUST colours (the slope override
  // supplies the exposed rock, itself Mars↔Moon tinted in this band):
  // cold→warm = Moon (light grey dust) → … → Mars (grey-yellow/red dust).
  [0.68, 0.68, 0.7],
  [0.6, 0.57, 0.53],
  [0.65, 0.54, 0.42],
  [0.71, 0.52, 0.36],
  // dry row (v = ¼):    ice          barren rock   dune          beach
  [0.75, 0.8, 0.88],
  [0.45, 0.41, 0.37],
  [0.73, 0.6, 0.4],
  [0.78, 0.69, 0.5],
  // med row (v = ½):    ice          lichen        steppe        beach
  [0.8, 0.86, 0.92],
  [0.55, 0.58, 0.47],
  [0.62, 0.6, 0.38],
  [0.79, 0.7, 0.52],
  // wet row (v = ¾):    snow         scrub         forest        beach
  [0.92, 0.94, 0.97],
  [0.46, 0.51, 0.35],
  [0.16, 0.37, 0.19],
  [0.8, 0.72, 0.55],
  // marine row (v = 1): bottom muck  kelp bed      coral         sand
  // (no "barren" cell — the photic fade to sediment already bares the
  // seafloor wherever light dies, at any temperature)
  [0.14, 0.13, 0.11],
  [0.16, 0.26, 0.15],
  [0.78, 0.42, 0.5],
  [0.76, 0.68, 0.54],
]

/**
 * The VARIATION palette — a second colour per cell, mixed by medium-frequency
 * noise so a biome shifts hue in patches instead of being one flat paint:
 * coral dithers pink ↔ orange, kelp olive ↔ brown, sand banded. Cells equal
 * to their `MANTA_PALETTE` entry get no variation; most don't need any.
 */
export const MANTA_PALETTE_B: number[][] = [
  // dead row: dust drifts — moon grey ↔ darker; mars dust ↔ redder
  [0.6, 0.6, 0.63],
  [0.55, 0.52, 0.49],
  [0.6, 0.48, 0.36],
  [0.62, 0.42, 0.28],
  // dry row: subtle banding on dune/beach only
  [0.75, 0.8, 0.88],
  [0.45, 0.41, 0.37],
  [0.68, 0.55, 0.38],
  [0.74, 0.66, 0.46],
  // med row: unchanged
  [0.8, 0.86, 0.92],
  [0.55, 0.58, 0.47],
  [0.62, 0.6, 0.38],
  [0.79, 0.7, 0.52],
  // wet row: forest varies deep ↔ lighter green
  [0.92, 0.94, 0.97],
  [0.46, 0.51, 0.35],
  [0.22, 0.44, 0.22],
  [0.8, 0.72, 0.55],
  // marine row: muck unchanged · kelp olive ↔ brown · coral pink ↔ ORANGE · sand banded
  [0.14, 0.13, 0.11],
  [0.27, 0.26, 0.13],
  [0.85, 0.52, 0.3],
  [0.72, 0.63, 0.48],
]

const CLIFF_COLOR: [number, number, number] = [0.38, 0.35, 0.33]
const SEDIMENT_COLOR: [number, number, number] = [0.32, 0.33, 0.3]

export class BiomePlugin extends BABYLON.MaterialPluginBase {
  params: BiomeParams = defaultBiomeParams()
  /** 20 rgb triples, row-major over the 4×5 chart (dead→dry→med→wet→marine). */
  palette: number[][] = MANTA_PALETTE
  /** Per-cell variation colours (mixed by medium-frequency noise); cells equal
   * to their `palette` entry don't vary. */
  paletteB: number[][] = MANTA_PALETTE_B
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'Biome', 210, { BIOME: false })
  }

  get isEnabled(): boolean {
    return this._isEnabled
  }

  set isEnabled(enabled: boolean) {
    if (this._isEnabled === enabled) return
    this._isEnabled = enabled
    this.markAllDefinesAsDirty()
    this._enable(enabled)
  }

  prepareDefines(defines: BABYLON.MaterialDefines): void {
    defines.BIOME = this._isEnabled
  }

  getClassName(): string {
    return 'BiomePlugin'
  }

  getUniforms(): {
    ubo: { name: string; size: number; type: string }[]
    fragment: string
  } {
    return {
      ubo: [
        { name: 'biomeCfg', size: 4, type: 'vec4' }, // seaLevel, baseTemp, lapse, mapMoisture
        { name: 'biomeNoise', size: 4, type: 'vec4' }, // tScale, tAmp, mScale, mAmp
        { name: 'biomeDither', size: 4, type: 'vec4' }, // ditherScale, ditherAmp, cliffStart, cliffFull
        { name: 'biomeWater', size: 4, type: 'vec4' }, // fog, murk, insolation, cliffCling
        { name: 'biomePlanet', size: 4, type: 'vec4' }, // center xyz, seaRadius (0 = flat front-end)
        { name: 'biomePlanetB', size: 4, type: 'vec4' }, // latWarpScale, latWarpAmp, detailScale, detailAmp
        { name: 'biomeSurf', size: 4, type: 'vec4' }, // surfDepth, unused ×3
        { name: 'biomePalette', size: 4, type: 'vec4', arraySize: 20 } as any,
        { name: 'biomePaletteB', size: 4, type: 'vec4', arraySize: 20 } as any,
      ],
      fragment: `#ifdef BIOME
        uniform vec4 biomeCfg;
        uniform vec4 biomeNoise;
        uniform vec4 biomeDither;
        uniform vec4 biomeWater;
        uniform vec4 biomePlanet;
        uniform vec4 biomePlanetB;
        uniform vec4 biomeSurf;
        uniform vec4 biomePalette[20];
        uniform vec4 biomePaletteB[20];
      #endif`,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    if (!this._isEnabled) return
    const p = this.params
    uniformBuffer.updateFloat4(
      'biomeCfg',
      p.seaLevel,
      p.baseTemperature,
      p.lapseRate,
      p.mapMoisture
    )
    uniformBuffer.updateFloat4(
      'biomeNoise',
      p.tNoiseScale,
      p.tNoiseAmp,
      p.mNoiseScale,
      p.mNoiseAmp
    )
    uniformBuffer.updateFloat4(
      'biomeDither',
      p.ditherScale,
      p.ditherAmp,
      p.cliffStart,
      p.cliffFull
    )
    uniformBuffer.updateFloat4(
      'biomeWater',
      p.underwaterFog,
      p.underwaterMurk,
      p.insolation,
      p.cliffCling
    )
    uniformBuffer.updateFloat4(
      'biomePlanet',
      p.planetCenter.x,
      p.planetCenter.y,
      p.planetCenter.z,
      p.seaRadius
    )
    uniformBuffer.updateFloat4(
      'biomePlanetB',
      p.latWarpScale,
      p.latWarpAmp,
      p.detailNoiseScale,
      p.detailNoiseAmp
    )
    uniformBuffer.updateFloat4('biomeSurf', p.surfDepth, 0, 0, 0)
    const pack = (src: number[][]) => {
      const flat = new Float32Array(20 * 4)
      for (let i = 0; i < 20; i++) {
        const c = src[i] ?? [1, 0, 1]
        flat[i * 4] = c[0]
        flat[i * 4 + 1] = c[1]
        flat[i * 4 + 2] = c[2]
        flat[i * 4 + 3] = 1
      }
      return flat
    }
    uniformBuffer.updateFloatArray('biomePalette', pack(this.palette))
    uniformBuffer.updateFloatArray('biomePaletteB', pack(this.paletteB))
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef BIOME
      // --- compact 2D simplex (IQ-style hash gradient) — world-space, highp ---
      vec2 bioHash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float bioSimplex(vec2 p) {
        const float K1 = 0.366025404; // (sqrt(3)-1)/2
        const float K2 = 0.211324865; // (3-sqrt(3))/6
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        float m = step(a.y, a.x);
        vec2 o = vec2(m, 1.0 - m);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a, bioHash2(i)), dot(b, bioHash2(i + o)), dot(c, bioHash2(i + 1.0)));
        return dot(n, vec3(70.0));
      }
      // --- 3D value-gradient noise for the ALBEDO-VISIBLE layers -----------
      // Everything used to sample wp.xz, which is Y-constant: cliff faces got
      // vertical streaks. Dither/variation/detail now sample the full world
      // position, so vertical rock carries texture like everything else. The
      // classification fBm stays 2D deliberately — climate is a MAP (and the
      // altitude term already varies it vertically); 4 upgraded evals ≈ the
      // budgeted cost, to be confirmed on-device in the design's step 6 pass.
      vec3 bioHash3(vec3 p) {
        p = vec3(
          dot(p, vec3(127.1, 311.7, 74.7)),
          dot(p, vec3(269.5, 183.3, 246.1)),
          dot(p, vec3(113.5, 271.9, 124.6))
        );
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float bioSimplex3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        return 1.3 * mix(
          mix(
            mix(dot(bioHash3(i), f), dot(bioHash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
            mix(dot(bioHash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)), dot(bioHash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x),
            u.y
          ),
          mix(
            mix(dot(bioHash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)), dot(bioHash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
            mix(dot(bioHash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)), dot(bioHash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x),
            u.y
          ),
          u.z
        );
      }
      float bioFbm(vec2 p) {
        // 2 octaves — the budget note in the design doc; add the third only
        // after profiling on mid-range mobile Safari.
        return bioSimplex(p) + 0.5 * bioSimplex(p * 2.03 + 17.7);
      }
      // --- the pure model, mirrored (see biome-chart.ts for the tests) ---
      float bioSlopeMask(float normalUp, float cliffStart, float cliffFull) {
        return smoothstep(cliffStart, cliffFull, normalUp);
      }
      float bioPhotic(float depth, float fog, float murk) {
        if (depth <= 0.0) return 1.0;
        float density = fog + murk * (depth / 30.0);
        float d = density * depth;
        return exp(-d * d);
      }
      vec3 bioChartColour(float u, float v, float varN) {
        // cellBlend, unrolled for the 4x5 chart: smoothstepped bilinear over
        // the 2x2 neighbourhood. Band centres are pure; edges ease. Each tap
        // mixes its cell's A/B colours by varN — within-biome hue patches
        // (coral pink ↔ orange) with zero extra structure.
        float fu = clamp(u, 0.0, 1.0) * 3.0;
        float fv = clamp(v, 0.0, 1.0) * 4.0;
        float c0 = min(2.0, floor(fu));
        float r0 = min(3.0, floor(fv));
        float tu = smoothstep(0.0, 1.0, fu - c0);
        float tv = smoothstep(0.0, 1.0, fv - r0);
        int i00 = int(r0) * 4 + int(c0);
        vec3 c00 = mix(biomePalette[i00].rgb, biomePaletteB[i00].rgb, varN);
        vec3 c01 = mix(biomePalette[i00 + 1].rgb, biomePaletteB[i00 + 1].rgb, varN);
        vec3 c10 = mix(biomePalette[i00 + 4].rgb, biomePaletteB[i00 + 4].rgb, varN);
        vec3 c11 = mix(biomePalette[i00 + 5].rgb, biomePaletteB[i00 + 5].rgb, varN);
        return mix(mix(c00, c01, tu), mix(c10, c11, tu), tv);
      }
      #endif`,
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `#ifdef BIOME
      {
        // World-space throughout (highp): seams are impossible by construction.
        vec3 wp = vPositionW;
        // The two front-ends share everything but the AXES (biome-chart.ts):
        // flat = worldY − seaLevel with world-up; planetary (seaRadius > 0) =
        // RADIAL altitude with radial up + insolation over warped latitude.
        bool planetary = biomePlanet.w > 0.0;
        vec3 rel = wp - biomePlanet.xyz;
        float r = length(rel);
        vec3 up = planetary ? rel / max(r, 1e-5) : vec3(0.0, 1.0, 0.0);
        float altitude = planetary ? (r - biomePlanet.w) : (wp.y - biomeCfg.x);
        // mantaAxes: |altitude| lapse (peaks at sea level, cools both ways) +
        // fBm axis noise — noise feeds the INPUTS, never the classification.
        float tN = bioFbm(wp.xz * biomeNoise.x) * biomeNoise.y;
        float mN = bioFbm(wp.xz * biomeNoise.z + 71.3) * biomeNoise.w;
        float temperature = biomeCfg.y - biomeCfg.z * abs(altitude) + tN;
        if (planetary) {
          // planetaryAxes: insolation over asin latitude, latWarp BEFORE the
          // temperature calc — banding wobbles instead of painting on.
          float lat = asin(clamp(rel.y / max(r, 1e-5), -1.0, 1.0));
          float latW = lat + bioSimplex(rel.xz * biomePlanetB.x) * biomePlanetB.y;
          temperature += biomeWater.z * cos(latW);
        }
        bool underwater = altitude < 0.0;
        // Land occupies the dead→wet rows (v ≤ ¾); the marine row (v = 1) is
        // the sea's alone, so a soaking-wet coast blends TOWARD the beach/sand
        // boundary rather than classifying as seafloor.
        float moisture = underwater
          ? 1.0
          : clamp(biomeCfg.w + mN, 0.0, 1.0) * 0.75;
        // edgeDither moves the crossfade inputs (organic borders, not contours)
        float dith = bioSimplex3(wp * biomeDither.x) * biomeDither.y;
        // Within-biome variation: medium-frequency patches select between each
        // cell's A/B colours (coral pink ↔ orange, kelp olive ↔ brown).
        float varN = 0.5 + 0.5 * bioSimplex3(wp * (biomeNoise.x * 3.1) + 31.7);
        vec3 biome = bioChartColour(temperature + dith, moisture + dith, varN);
        // photic cutoff: growth colour dies to bare sediment exactly where the
        // shared water fog curve kills the light.
        if (underwater) {
          // Surf/swash band FIRST: wave action bares the first metres of
          // bottom — wet sand here (rock on slopes via the cliff override),
          // so coral/kelp never start at the waterline itself. The band edge
          // wobbles with the same dither as every other boundary.
          float surf = 1.0 - smoothstep(biomeSurf.x * 0.4, biomeSurf.x, -altitude + dith * 12.0);
          if (biomeSurf.x > 0.0) biome = mix(biome, vec3(0.6, 0.54, 0.42), surf);
          float light = bioPhotic(-altitude, biomeWater.x, biomeWater.y);
          biome = mix(vec3(${SEDIMENT_COLOR.join(', ')}), biome, light);
        }
        // Detail breakup: one high-frequency + one slower octave of LOW-
        // contrast brightness variation on the albedo — flat bands read as
        // surface, and the extra frequency also visually breaks any residual
        // shading banding on steep faces.
        if (biomePlanetB.w > 0.0) {
          float det = 0.7 * bioSimplex3(wp * biomePlanetB.z)
                    + 0.3 * bioSimplex3(wp * (biomePlanetB.z * 0.13) + 5.7);
          biome *= 1.0 + biomePlanetB.w * det;
        }
        // slope override OUTSIDE the chart: cliffs at any altitude/depth; cave
        // walls classify as cliffs automatically.
        #ifdef NORMAL
          // Slope vs the front-end's UP — world-up flat, RADIAL on a planet
          // (a mountainside near the pole is a cliff, not a "wall"). The SAME
          // edgeDither perturbs the slope INPUT, so the cliff line breaks up
          // organically like the biome bands instead of tracing a clean
          // contour — one dither, every edge, zero extra noise evals.
          float cliff = bioSlopeMask(dot(normalize(vNormalW), up) + dith, biomeDither.z, biomeDither.w);
          // In the DEAD band the exposed rock itself changes world: warm dead
          // = Mars red rock, cold dead = Moon dark grey — the dust (chart row)
          // and the rock (slope override) tell the same story.
          float deadness = 1.0 - smoothstep(0.02, 0.2, moisture);
          vec3 deadRock = mix(vec3(0.3, 0.3, 0.33), vec3(0.5, 0.3, 0.22), clamp(temperature, 0.0, 1.0));
          vec3 cliffCol = mix(vec3(${CLIFF_COLOR.join(
            ', '
          )}), deadRock, deadness);
          // Fecund cliffs grow: in warm+wet climates the local biome breaks
          // through the rock in dither-driven pockets — plants clinging to
          // cliff-sides wherever life is rampant (underwater too: photic
          // growth on rock walls, dying to bare stone with the light). Cold
          // or dry faces stay bare; the pockets keep it from looking painted.
          float fecund = clamp(temperature, 0.0, 1.0) * clamp(moisture * 1.5, 0.0, 1.0);
          float pocket = clamp(0.5 + dith * 9.0, 0.0, 1.0);
          cliff *= 1.0 - biomeWater.w * fecund * pocket;
          biome = mix(biome, cliffCol, cliff);
        #endif
        diffuseColor = biome;
      }
      #endif`,
    }
  }
}

/**
 * Attach (or retrieve) the biome plugin on a material — for authored tiles or
 * any mesh that should classify like the terrain. `b3d-terrain biome="on"`
 * uses this on its own material.
 */
export function attachBiomePlugin(
  material: BABYLON.Material,
  params?: Partial<BiomeParams>
): BiomePlugin {
  const existing = material.pluginManager?.getPlugin('Biome') as BiomePlugin
  const plugin = existing ?? new BiomePlugin(material)
  if (params) Object.assign(plugin.params, params)
  plugin.isEnabled = true
  return plugin
}
