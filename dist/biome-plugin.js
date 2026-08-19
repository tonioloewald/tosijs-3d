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
/*{ "parent": "environment", "order": 900 }*/
import * as BABYLON from '@babylonjs/core';
export const defaultBiomeParams = () => ({
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
    equatorTemp: 0.85,
    temperateTemp: 0.55,
    poleTemp: 0.05,
    rainShadow: 0.25,
    windAzimuth: 0.8,
    moistureDryHeight: 8,
    slopeExaggeration: 1,
    latWarpScale: 0.02,
    latWarpAmp: 0.12,
    detailNoiseScale: 0.55,
    detailNoiseAmp: 0.1,
    cliffCling: 0.55,
    strata: 0.35,
    strataScale: 0.06,
    strataTilt: 0.12,
    surfDepth: 3,
    volcanism: 0,
    volcanicScale: 0.09,
    veinWidth: 0.06,
    glowAnimation: 1,
    interior: 0,
    waterTable: 0,
    noWater: 0,
    volcanicPalette: LAVA_PALETTE.map((c) => [...c]),
});
/** Molten-rock volcanism (the default `volcanicPalette`). Ladder order:
 * rock1, rock2, cold vein, ember, molten, pool edge, pool bright. */
export const LAVA_PALETTE = [
    [0.045, 0.045, 0.07], // stage-1 rock: near-black basalt
    [0.16, 0.1, 0.06], // stage-2 rock: dark brown
    [0.12, 0.07, 0.045], // cold vein: dark brown voronoi
    [0.35, 0.08, 0.02], // ember seam: deep red
    [1.7, 0.85, 0.1], // molten seam: orange-yellow (glow > 1)
    [0.55, 0.14, 0.02], // pool crust edge: red-orange
    [1.9, 1.45, 0.3], // pool bright: ALMOST YELLOW — the hottest thing on screen
];
/** Cryovolcanism: frozen worlds venting molten WATER — pale green-white ice
 * for rock, teal voronoi veins, blue-white glowing melt. Same ladder. */
export const CRYOVOLCANIC_PALETTE = [
    [0.09, 0.12, 0.13], // stage-1 rock: dark dirty ice
    [0.5, 0.58, 0.55], // stage-2 rock: pale green-white ice
    [0.1, 0.2, 0.22], // cold vein: deep teal
    [0.1, 0.4, 0.45], // ember seam: dim cyan
    [0.5, 1.45, 1.6], // molten seam: glowing blue-white
    [0.14, 0.45, 0.5], // pool crust edge
    [0.75, 1.6, 1.7], // pool bright
];
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
export const MANTA_PALETTE = [
    // DEAD row (v = 0) — absolute zero moisture: complete barren even on the
    // flat, at ANY temperature. These are DUST colours (the slope override
    // supplies the exposed rock, itself Mars↔Moon tinted in this band):
    // cold→warm = Moon (light grey dust) → … → Mars (grey-yellow/red dust).
    [0.56, 0.56, 0.58],
    [0.5, 0.47, 0.44],
    [0.6, 0.46, 0.34],
    [0.66, 0.4, 0.27],
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
];
/**
 * The VARIATION palette — a second colour per cell, mixed by medium-frequency
 * noise so a biome shifts hue in patches instead of being one flat paint:
 * coral dithers pink ↔ orange, kelp olive ↔ brown, sand banded. Cells equal
 * to their `MANTA_PALETTE` entry get no variation; most don't need any.
 */
export const MANTA_PALETTE_B = [
    // dead row: dust drifts — moon grey ↔ darker; mars dust ↔ redder
    [0.48, 0.48, 0.51],
    [0.44, 0.42, 0.4],
    [0.54, 0.4, 0.29],
    [0.58, 0.34, 0.22],
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
];
const CLIFF_COLOR = [0.38, 0.35, 0.33];
const SEDIMENT_COLOR = [0.32, 0.33, 0.3];
export class BiomePlugin extends BABYLON.MaterialPluginBase {
    params = defaultBiomeParams();
    /** 20 rgb triples, row-major over the 4×5 chart (dead→dry→med→wet→marine). */
    palette = MANTA_PALETTE;
    /** Per-cell variation colours (mixed by medium-frequency noise); cells equal
     * to their `palette` entry don't vary. */
    paletteB = MANTA_PALETTE_B;
    _isEnabled = false;
    _t0 = performance.now();
    constructor(material) {
        super(material, 'Biome', 210, { BIOME: false });
    }
    get isEnabled() {
        return this._isEnabled;
    }
    set isEnabled(enabled) {
        if (this._isEnabled === enabled)
            return;
        this._isEnabled = enabled;
        this.markAllDefinesAsDirty();
        this._enable(enabled);
    }
    prepareDefines(defines) {
        defines.BIOME = this._isEnabled;
    }
    getClassName() {
        return 'BiomePlugin';
    }
    getUniforms() {
        return {
            ubo: [
                { name: 'biomeCfg', size: 4, type: 'vec4' }, // seaLevel, baseTemp, lapse, mapMoisture
                { name: 'biomeNoise', size: 4, type: 'vec4' }, // tScale, tAmp, mScale, mAmp
                { name: 'biomeDither', size: 4, type: 'vec4' }, // ditherScale, ditherAmp, cliffStart, cliffFull
                { name: 'biomeWater', size: 4, type: 'vec4' }, // fog, murk, glowAnimation, cliffCling
                { name: 'biomePlanet', size: 4, type: 'vec4' }, // center xyz, seaRadius (0 = flat front-end)
                { name: 'biomePlanetB', size: 4, type: 'vec4' }, // latWarpScale, latWarpAmp, detailScale, detailAmp
                { name: 'biomeSurf', size: 4, type: 'vec4' }, // surfDepth, volcanism, volcanicScale, veinWidth
                { name: 'biomeStrata', size: 4, type: 'vec4' }, // strength, scale, tilt, unused
                { name: 'biomePlanetC', size: 4, type: 'vec4' }, // equatorTemp, temperateTemp, poleTemp, slopeExaggeration
                { name: 'biomePlanetD', size: 4, type: 'vec4' }, // rainShadow, windAzimuth, moistureDryHeight, animTime
                { name: 'biomePalette', size: 4, type: 'vec4', arraySize: 20 },
                { name: 'biomePaletteB', size: 4, type: 'vec4', arraySize: 20 },
                { name: 'biomeVolcPal', size: 4, type: 'vec4', arraySize: 7 },
                { name: 'biomeExtra', size: 4, type: 'vec4' }, // interior, waterTable, noWater, spare
            ],
            fragment: `#ifdef BIOME
        uniform vec4 biomeCfg;
        uniform vec4 biomeNoise;
        uniform vec4 biomeDither;
        uniform vec4 biomeWater;
        uniform vec4 biomePlanet;
        uniform vec4 biomePlanetB;
        uniform vec4 biomeSurf;
        uniform vec4 biomeStrata;
        uniform vec4 biomePlanetC;
        uniform vec4 biomePlanetD;
        uniform vec4 biomePalette[20];
        uniform vec4 biomePaletteB[20];
        uniform vec4 biomeVolcPal[7];
        uniform vec4 biomeExtra;
      #endif`,
        };
    }
    bindForSubMesh(uniformBuffer) {
        if (!this._isEnabled)
            return;
        const p = this.params;
        uniformBuffer.updateFloat4('biomeCfg', p.seaLevel, p.baseTemperature, p.lapseRate, p.mapMoisture);
        uniformBuffer.updateFloat4('biomeNoise', p.tNoiseScale, p.tNoiseAmp, p.mNoiseScale, p.mNoiseAmp);
        uniformBuffer.updateFloat4('biomeDither', p.ditherScale, p.ditherAmp, p.cliffStart, p.cliffFull);
        uniformBuffer.updateFloat4('biomeWater', p.underwaterFog, p.underwaterMurk, p.glowAnimation, p.cliffCling);
        uniformBuffer.updateFloat4('biomeStrata', p.strata, p.strataScale, p.strataTilt, 0);
        uniformBuffer.updateFloat4('biomePlanetC', p.equatorTemp, p.temperateTemp, p.poleTemp, p.slopeExaggeration);
        // .w is the lava-animation clock — wrapped so the shader float never
        // loses precision on a long-running page (the motion is periodic-ish
        // noise, so the wrap seam is invisible)
        uniformBuffer.updateFloat4('biomePlanetD', p.rainShadow, p.windAzimuth, p.moistureDryHeight, ((performance.now() - this._t0) / 1000) % 3600);
        uniformBuffer.updateFloat4('biomePlanet', p.planetCenter.x, p.planetCenter.y, p.planetCenter.z, p.seaRadius);
        uniformBuffer.updateFloat4('biomePlanetB', p.latWarpScale, p.latWarpAmp, p.detailNoiseScale, p.detailNoiseAmp);
        uniformBuffer.updateFloat4('biomeSurf', p.surfDepth, p.volcanism, p.volcanicScale, p.veinWidth);
        const pack = (src) => {
            const flat = new Float32Array(20 * 4);
            for (let i = 0; i < 20; i++) {
                const c = src[i] ?? [1, 0, 1];
                flat[i * 4] = c[0];
                flat[i * 4 + 1] = c[1];
                flat[i * 4 + 2] = c[2];
                flat[i * 4 + 3] = 1;
            }
            return flat;
        };
        uniformBuffer.updateFloatArray('biomePalette', pack(this.palette));
        uniformBuffer.updateFloatArray('biomePaletteB', pack(this.paletteB));
        const vp = this.params.volcanicPalette ?? LAVA_PALETTE;
        const vflat = new Float32Array(7 * 4);
        for (let i = 0; i < 7; i++) {
            const c = vp[i] ?? LAVA_PALETTE[i];
            vflat[i * 4] = c[0];
            vflat[i * 4 + 1] = c[1];
            vflat[i * 4 + 2] = c[2];
            vflat[i * 4 + 3] = 1;
        }
        uniformBuffer.updateFloatArray('biomeVolcPal', vflat);
        uniformBuffer.updateFloat4('biomeExtra', p.interior, p.waterTable, p.noWater, 0);
    }
    getCustomCode(shaderType) {
        if (shaderType === 'vertex') {
            // The LOCAL-province channel rides the colour buffer's alpha, but
            // Babylon's vertexColorMixing include copies only color.rgb into vColor
            // unless VERTEXALPHA is defined — and VERTEXALPHA would flip the whole
            // mesh onto the alpha-blend path. So we read the raw attribute here and
            // carry it on our own varying (1 = none, matching the buffer encoding).
            return {
                CUSTOM_VERTEX_DEFINITIONS: `#if defined(BIOME) && defined(VERTEXCOLOR)
          varying float vBiomeProvince;
        #endif`,
                CUSTOM_VERTEX_MAIN_END: `#if defined(BIOME) && defined(VERTEXCOLOR)
          vBiomeProvince = color.a;
        #endif`,
            };
        }
        if (shaderType !== 'fragment')
            return null;
        return {
            CUSTOM_FRAGMENT_DEFINITIONS: `#if defined(BIOME) && defined(VERTEXCOLOR)
        varying float vBiomeProvince;
      #endif
      #ifdef BIOME
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
      // Worley/cellular noise for the volcanic plates: F1 = distance to the
      // nearest cell point, F2 the second — F2−F1 → 0 exactly on the borders
      // between plates, which is where the lava veins live.
      vec2 bioCellHash(vec2 c) {
        return fract(sin(vec2(
          dot(c, vec2(127.1, 311.7)),
          dot(c, vec2(269.5, 183.3))
        )) * 43758.5453);
      }
      vec2 bioWorley(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float F1 = 8.0;
        float F2 = 8.0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            float d = length(g + bioCellHash(i + g) - f);
            if (d < F1) { F2 = F1; F1 = d; }
            else if (d < F2) { F2 = d; }
          }
        }
        return vec2(F1, F2);
      }
      // 3D Worley — the volcanic plates as VOLUMES rather than a pattern
      // painted on the ground. Costs the same neighbourhood as blending three
      // 2D projections (27 cells either way, a 3-wide hash instead of 2-wide)
      // and is strictly better: no projection seams, no ghosting where two
      // planes blend, and a CUT FACE shows the veins' true cross-sections
      // because the veins are genuinely three-dimensional. Only the volcanism
      // branch reaches it, so a non-volcanic surface pays nothing.
      vec3 bioCellHash3(vec3 c) {
        return fract(sin(vec3(
          dot(c, vec3(127.1, 311.7, 74.7)),
          dot(c, vec3(269.5, 183.3, 246.1)),
          dot(c, vec3(113.5, 271.9, 124.6))
        )) * 43758.5453);
      }
      vec2 bioWorley3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        float F1 = 8.0;
        float F2 = 8.0;
        for (int z = -1; z <= 1; z++) {
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec3 g = vec3(float(x), float(y), float(z));
              float d = length(g + bioCellHash3(i + g) - f);
              if (d < F1) { F2 = F1; F1 = d; }
              else if (d < F2) { F2 = d; }
            }
          }
        }
        return vec2(F1, F2);
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
        // Moisture noise scales with AVAILABLE moisture: an airless world has
        // no damp patches, so mapMoisture 0 is EXACTLY the dead row (moon
        // grey when cold — never phantom ice). Just above zero, cold regions
        // grow polar ice naturally: Mars with ice caps, which is correct.
        float mN = bioFbm(wp.xz * biomeNoise.z + 71.3) * biomeNoise.w;
        float temperature = biomeCfg.y - biomeCfg.z * abs(altitude) + tN;
        float effMapM = biomeCfg.w;
        if (planetary) {
          // The three-point latitude curve authors think in: equator →
          // temperate (45°) → pole, over latWarped asin latitude (the warp
          // runs BEFORE the calc, so banding wobbles instead of painting on).
          float lat = asin(clamp(rel.y / max(r, 1e-5), -1.0, 1.0));
          float latW = lat + bioSimplex(rel.xz * biomePlanetB.x) * biomePlanetB.y;
          float alat = clamp(abs(latW) / 1.5707963, 0.0, 1.0);
          float latT = alat < 0.5
            ? mix(biomePlanetC.x, biomePlanetC.y, alat * 2.0)
            : mix(biomePlanetC.y, biomePlanetC.z, alat * 2.0 - 1.0);
          temperature = latT - biomeCfg.z * abs(altitude) + tN;
          // ROUGH moisture estimate: proximity to water (map moisture dries
          // with altitude — coasts wet, highlands dry) + orographic rain
          // shadow (windward slopes wet, leeward dry, off the surface normal
          // — the classic no-upstream-sampling approximation).
          float dry = exp(-max(altitude, 0.0) / max(biomePlanetD.z, 1e-3));
          float oro = 0.0;
          #ifdef NORMAL
            vec3 wind = vec3(cos(biomePlanetD.y), 0.0, sin(biomePlanetD.y));
            oro = biomePlanetD.x * dot(normalize(vNormalW), -wind);
          #endif
          effMapM = clamp(biomeCfg.w * dry + oro, 0.0, 1.0);
        }
        // Submerged? OUTSIDE, the sea surface decides (altitude < 0). INSIDE
        // the ground, the WATER TABLE does — which is usually HIGHER than sea
        // level inland, so a hillside tunnel can flood while its mouth sits
        // well above the shore. A flooded cave classifying as submerged is
        // correct, not a bug: that's what a sea cave IS. noWater is the only
        // thing that makes an interior dry at any depth, and it's a property
        // of the world, stated — never inferred from a coordinate.
        bool flooded = biomeExtra.z < 0.5 && wp.y < biomeExtra.y;
        bool underwater = biomeExtra.x > 0.5 ? flooded : altitude < 0.0;
        // The MOISTURE GATE: on an airless world there is no sea at all —
        // below "sea level" is just lower dead land. Everything oceanic
        // (marine-row saturation here; surf + photic below) scales with it.
        // The gate reads the SCENE moisture (aliveness), not the local
        // estimate — a dry highland on a living planet still belongs to a
        // world with oceans.
        float mGate = smoothstep(0.0, 0.25, biomeCfg.w);
        // Land occupies the dead→wet rows (v ≤ ¾); the marine row (v = 1) is
        // the sea's alone, so a soaking-wet coast blends TOWARD the beach/sand
        // boundary rather than classifying as seafloor.
        float landM = clamp(effMapM + mN * mGate, 0.0, 1.0) * 0.75;
        float moisture = underwater ? mix(landM, 1.0, mGate) : landM;
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
          float surf = (1.0 - smoothstep(biomeSurf.x * 0.4, biomeSurf.x, -altitude + dith * 12.0)) * mGate;
          if (biomeSurf.x > 0.0) biome = mix(biome, vec3(0.6, 0.54, 0.42), surf);
          float light = mix(1.0, bioPhotic(-altitude, biomeWater.x, biomeWater.y), mGate);
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
          // slopeExaggeration scales the DEVIATION from up before the cliff
          // test — planet-scale contours are gentle, so raw normals would
          // never read as cliffs at planetary radii.
          float cosUp = 1.0 - (1.0 - dot(normalize(vNormalW), up)) * biomePlanetC.w;
          float cliff = bioSlopeMask(cosUp + dith, biomeDither.z, biomeDither.w);
          // In the DEAD band the exposed rock itself changes world: warm dead
          // = Mars red rock, cold dead = Moon dark grey — the dust (chart row)
          // and the rock (slope override) tell the same story.
          float deadness = 1.0 - smoothstep(0.02, 0.2, moisture);
          vec3 deadRock = mix(vec3(0.3, 0.3, 0.33), vec3(0.5, 0.3, 0.22), clamp(temperature, 0.0, 1.0));
          vec3 cliffCol = mix(vec3(${CLIFF_COLOR.join(', ')}), deadRock, deadness);
          // Fecund cliffs grow: in warm+wet climates the local biome breaks
          // through the rock in dither-driven pockets — plants clinging to
          // cliff-sides wherever life is rampant (underwater too: photic
          // growth on rock walls, dying to bare stone with the light). Cold
          // or dry faces stay bare; the pockets keep it from looking painted.
          float cliffRaw = cliff; // geometric slope, pre-fecundity (volcanism wants it)
          float fecund = clamp(temperature, 0.0, 1.0) * clamp(moisture * 1.5, 0.0, 1.0);
          float pocket = clamp(0.5 + dith * 9.0, 0.0, 1.0);
          cliff *= 1.0 - biomeWater.w * fecund * pocket;
          // Interior surfaces shade as rock whatever their slope (a cavern
          // FLOOR is level, and the chart would happily grow grass on it) —
          // but as a RAMP, not a switch. At a cave mouth the walls are still
          // half-outside: lit, weathered, continuous with the hillside. Snapping
          // to rock exactly at the threshold draws a hard ring around every
          // entrance. The ramp arrives per-vertex (depth below the surface,
          // written at extraction), so the transition happens over metres of
          // tunnel instead of at one triangle.
          // The per-vertex channel, read ONCE and used twice: as the local
          // volcanism province on terrain tiles, and as the interior ramp on
          // patch walls. Declared here because the interior ramp (just below)
          // is its first use — it used to live down in the volcanism block,
          // which compiled fine until something above it needed the value.
          float provLocal = 0.0;
          #ifdef VERTEXCOLOR
            provLocal = 1.0 - vBiomeProvince;
          #endif
          cliff = max(cliff, biomeExtra.x * provLocal);
          biome = mix(biome, cliffCol, cliff);
          // --- VOLCANISM: the override that outranks climate ---------------
          // LOCAL provinces: terrain tiles carry a per-vertex volcanism field
          // in the colour buffer's alpha (inverted — 1 = none), written by
          // b3d-terrain's provinceField. Where present it runs the ladder at
          // that local intensity, independent of the global dial: THIS island
          // is volcanic. Meshes without vertex colours (planets) skip it.
          // The per-vertex channel means DIFFERENT THINGS on different meshes:
          // a local volcanic province on terrain tiles, the interior ramp on
          // patch walls. Volcanism must only read the former, or a cave mouth
          // shades as a full-intensity volcano — which is exactly what
          // happened: black basalt and glowing lava inside an ordinary cave.
          float provVolc = biomeExtra.x > 0.5 ? 0.0 : provLocal;
          if (biomeSurf.y > 0.0 || provVolc > 0.0) {
            // Global provinces from a low-frequency mask; the volcanism param
            // slides the threshold, so 1.0 approaches everywhere and 0.3
            // gives scattered volcanic zones in a living landscape. The local
            // field ORs in as its own mask at its own intensity.
            float vn = 0.5 + 0.5 * bioSimplex(wp.xz * 0.006 + 3.3);
            float volcG = biomeSurf.y > 0.0
              ? smoothstep(0.6 - 0.6 * biomeSurf.y, 0.8 - 0.6 * biomeSurf.y, vn)
              : 0.0;
            float volc = max(volcG, smoothstep(0.02, 0.3, provVolc));
            float vEff = max(biomeSurf.y, provVolc);
            if (volc > 0.0) {
              // The intensity LADDER (stage 1..3): 1 = near-black basalt with
              // DARK-BROWN voronoi seams; 2 = dark-brown rock with GLOWING
              // seams; 3 = patchy open lava. Horizontals climb 1 + 2·volcanism
              // up the ladder; verticals lag ONE full stage behind (lava pools
              // flat — cliff faces drain and crust over). Midpoint: cliffs
              // stage 1, flats stage 2. Extreme: cliffs stage 2, flats stage 3.
              // Water pushes volcanism DOWN half a stage (chilled crust:
              // pools revert to seams, seams toward cold voronoi) and MUTES
              // the glow rather than cancelling it — veins keep smouldering
              // under shallow water, dimming with depth. sub ramps over the
              // first couple of metres so the waterline isn't a hard seam.
              float sub = clamp(-altitude * 0.5, 0.0, 1.0);
              // The cliff lag SHRINKS as volcanism maxes out. A full stage of
              // lag at every level meant a vertical face could never exceed
              // stage 2 (1 + 2·1 − 1), so the whole top of the ladder — yellow
              // seams, orange-red rock — was unreachable on a cliff or a cut
              // face however volcanic it was. The lag is right at low
              // volcanism (a cliff drains and crusts over) and wrong at the
              // top, where the rock itself is molten and verticals glow too.
              float lag = cliffRaw * (1.0 - 0.75 * vEff);
              float stage = clamp(1.0 + 2.0 * vEff - lag - 0.5 * sub, 1.0, 3.0);
              // Veins WIDEN as the ladder climbs — gently through stage 2
              // (2x), then steeply through the molten transition (6x by
              // stage 3), so pools read as veins fattening until they MERGE
              // — one continuous process, not two patterns swapping.
              // 3D, not XZ-only. Sampling the plate pattern from world XZ
              // alone means a VERTICAL face barely moves through the noise — its
              // xz coordinate is almost constant across the surface — so a cliff
              // or a cut face got vertical STREAKS instead of cells and the vein
              // web simply was not there. Reported on a cutaway volcano, where
              // every interior wall is vertical.
              vec2 wF = bioWorley3(wp * biomeSurf.z);
              // Width spread across the ladder: 0.8x → 2.6x → 11x. The top end
              // is deliberately steep so pools read as veins FATTENING until
              // they merge, and the bottom slightly thinner than before so the
              // progression has somewhere to start.
              float vw = max(biomeSurf.w, 1e-3)
                * (1.25 + 1.8 * clamp(stage - 1.0, 0.0, 1.0) + 8.4 * clamp(stage - 2.0, 0.0, 1.0));
              float vein = 1.0 - smoothstep(0.0, vw, wF.y - wF.x);
              float t12 = clamp(stage - 1.0, 0.0, 1.0);
              float t23 = clamp(stage - 2.0, 0.0, 1.0);
              float damp = mix(1.0, mix(0.5, 0.15, clamp(-altitude / 15.0, 0.0, 1.0)), sub);
              // Subtle life in the glow: a slow spatially-phased pulse + a
              // 3D-noise churn drifting through time — shimmer, never a
              // global blink. glowAnimation (biomeWater.z) dials it; 0 = still.
              float tAnim = biomePlanetD.w;
              float churn = bioSimplex3(vec3(wp.xz * 0.05, tAnim * 0.11));
              // Applied to BOTH ember and molten: it used to touch only the
              // molten channel, which is a fraction of a fraction of the
              // surface, so the "slow pulse" was invisible in practice.
              float pulse = 1.0 + biomeWater.z * (0.17 * sin(tAnim * 0.8 + wp.x * 0.21 + wp.z * 0.17) + 0.26 * churn);
              // stage 1 → 2 → 3: base rock warms near-black basalt → dark
              // brown → RED-ORANGE. It used to stop at dark brown, so a fully
              // volcanic face read as black rock with seams on it rather than as
              // rock that is itself heating up. The crust-edge colour is the
              // right target: it is the hot-but-solid entry in the palette.
              // black → RED → orange. The stage-2 rock is the palette's dark
              // brown warmed toward ember, because brown reads as "dirt" next to
              // a glowing seam where the eye expects "hot rock"; stage 3 then
              // carries it to the crust-edge orange.
              vec3 rock2 = mix(biomeVolcPal[1].rgb, biomeVolcPal[3].rgb * 0.7, 0.55);
              vec3 volcGround = mix(
                mix(biomeVolcPal[0].rgb, rock2, t12),
                biomeVolcPal[5].rgb,
                t23 * 0.9
              );
              // SEDIMENTARY BANDING. Beds are a function of world Y — sheared a
              // little, and wobbled by low-frequency noise so they undulate the
              // way real beds do rather than reading as a ruler. Fades out as
              // the rock melts (stage 3): molten rock has no bedding left.
              float bedY = wp.y * biomeStrata.y
                + biomeStrata.z * (wp.x + wp.z) * biomeStrata.y
                + 0.35 * bioFbm(wp.xz * 0.01);
              float bed = 0.5 + 0.5 * sin(bedY * 6.2831853);
              float bedSharp = smoothstep(0.35, 0.65, bed);
              volcGround *= 1.0 + biomeStrata.x * (bedSharp - 0.5) * (1.0 - 0.8 * t23);
              // stage 1: seams are COLD dark brown; they hand over as glow rises.
              // Keep a floor under the cold seam so a stage-1 face still reads
              // as VEINED rock — near-black basalt with near-black seams on it
              // is indistinguishable from nothing, which is what a cutaway's
              // vertical walls looked like.
              // The cold seam warms toward ember as soon as the ladder starts, so
              // early veins read as THIN RED rather than as darker black — the
              // progression Tonio asked for begins at stage 1, not stage 2.
              vec3 coldVein = mix(biomeVolcPal[2].rgb, biomeVolcPal[3].rgb, 0.55 + 0.4 * t12);
              vec3 base = mix(volcGround, coldVein, vein * (1.0 - 0.65 * t12));
              // stage 2: seams glow — MOST are cooled ember, a slow mask picks
              // the live molten channels, so the field reads "lava under
              // rock", not "lava planet".
              // MORE of the field goes live as the ladder climbs — the molten
              // channels spread rather than just brightening, so heat looks like
              // it is taking over the rock instead of a fixed set of seams
              // getting hotter.
              float liveLo = 0.55 - 0.34 * t23;
              float live = smoothstep(liveLo, liveLo + 0.17, 0.5 + 0.5 * bioSimplex(wp.xz * 0.025 + 9.1));
              float glow = vein * t12 * damp;
              vec3 ember = mix(base, biomeVolcPal[3].rgb * pulse, glow);
              // …and the molten colour itself intensifies through stage 3, so
              // the top of the ladder is visibly hotter than the middle rather
              // than the same orange with wider seams.
              vec3 molten = mix(base, biomeVolcPal[4].rgb * pulse * (1.0 + 0.9 * t23), glow * (0.75 + dith * 4.0));
              vec3 volcCol = mix(ember, molten, live);
              // stage 2 → 3: seams give way to PATCHY open lava — broad soft
              // pools whose edges creep with the churn (crust breaking and
              // reforming); crusted rock between keeps its glowing seams.
              // (lavaPatch, not patch — 'patch' is a GLSL reserved word)
              float lavaPatch = smoothstep(0.35, 0.7, 0.5 + 0.5 * bioSimplex(wp.xz * 0.018 + 5.7) + 0.08 * churn * biomeWater.z);
              vec3 pool = mix(biomeVolcPal[5].rgb, biomeVolcPal[6].rgb * pulse, clamp(0.55 + dith * 5.0 + 0.25 * churn, 0.0, 1.0));
              volcCol = mix(volcCol, pool, t23 * lavaPatch * damp);
              biome = mix(biome, volcCol, volc);
            }
          }
        #endif
        diffuseColor = biome;
      }
      #endif`,
        };
    }
}
// Registered so `Material.clone()` can re-instantiate it (see the note in
// cloud-shadows.ts — an unregistered plugin makes cloning THROW).
BABYLON.RegisterMaterialPlugin('BiomePlugin', (material) => new BiomePlugin(material));
/**
 * Attach (or retrieve) the biome plugin on a material — for authored tiles or
 * any mesh that should classify like the terrain. `b3d-terrain biome="on"`
 * uses this on its own material.
 */
export function attachBiomePlugin(material, params) {
    const existing = material.pluginManager?.getPlugin('Biome');
    const plugin = existing ?? new BiomePlugin(material);
    if (params)
        Object.assign(plugin.params, params);
    plugin.isEnabled = true;
    return plugin;
}
//# sourceMappingURL=biome-plugin.js.map