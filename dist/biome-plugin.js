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
    insolation: 0.35,
    latWarpScale: 0.02,
    latWarpAmp: 0.12,
});
/**
 * The flat-colour Whittaker chart, 4 cols (u: cold → warm) × 3 rows (v: dry →
 * wet), row-major — organized so ecological neighbours are chart neighbours.
 * The wet row IS the marine column read warm→cold with depth:
 * abyssal → shelf → reef at the warm end; the beach emerges where the
 * terrestrial rows meet the wet edge at sea level.
 */
export const MANTA_PALETTE = [
    // dry row (v = 0):   polar rock   cold steppe   dry grass     sand desert
    [0.42, 0.42, 0.46],
    [0.55, 0.5, 0.4],
    [0.62, 0.58, 0.38],
    [0.78, 0.68, 0.45],
    // mid row (v = .5):  tundra       shrubland     grassland     savanna
    [0.5, 0.52, 0.45],
    [0.42, 0.52, 0.32],
    [0.35, 0.55, 0.28],
    [0.6, 0.58, 0.3],
    // wet row (v = 1):   abyssal      shelf         seagrass      reef
    [0.09, 0.12, 0.2],
    [0.16, 0.28, 0.34],
    [0.2, 0.42, 0.38],
    [0.75, 0.66, 0.5],
];
const CLIFF_COLOR = [0.38, 0.35, 0.33];
const SEDIMENT_COLOR = [0.32, 0.33, 0.3];
export class BiomePlugin extends BABYLON.MaterialPluginBase {
    params = defaultBiomeParams();
    /** 12 rgb triples, row-major over the 4×3 chart. Replace to re-theme. */
    palette = MANTA_PALETTE;
    _isEnabled = false;
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
                { name: 'biomeWater', size: 4, type: 'vec4' }, // fog, murk, insolation, unused
                { name: 'biomePlanet', size: 4, type: 'vec4' }, // center xyz, seaRadius (0 = flat front-end)
                { name: 'biomePlanetB', size: 4, type: 'vec4' }, // latWarpScale, latWarpAmp, unused, unused
                { name: 'biomePalette', size: 4, type: 'vec4', arraySize: 12 },
            ],
            fragment: `#ifdef BIOME
        uniform vec4 biomeCfg;
        uniform vec4 biomeNoise;
        uniform vec4 biomeDither;
        uniform vec4 biomeWater;
        uniform vec4 biomePlanet;
        uniform vec4 biomePlanetB;
        uniform vec4 biomePalette[12];
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
        uniformBuffer.updateFloat4('biomeWater', p.underwaterFog, p.underwaterMurk, p.insolation, 0);
        uniformBuffer.updateFloat4('biomePlanet', p.planetCenter.x, p.planetCenter.y, p.planetCenter.z, p.seaRadius);
        uniformBuffer.updateFloat4('biomePlanetB', p.latWarpScale, p.latWarpAmp, 0, 0);
        const flat = new Float32Array(12 * 4);
        for (let i = 0; i < 12; i++) {
            const c = this.palette[i] ?? [1, 0, 1];
            flat[i * 4] = c[0];
            flat[i * 4 + 1] = c[1];
            flat[i * 4 + 2] = c[2];
            flat[i * 4 + 3] = 1;
        }
        uniformBuffer.updateFloatArray('biomePalette', flat);
    }
    getCustomCode(shaderType) {
        if (shaderType !== 'fragment')
            return null;
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
      vec3 bioChartColour(float u, float v) {
        // cellBlend, unrolled for the 4x3 chart: smoothstepped bilinear over
        // the 2x2 neighbourhood. Band centres are pure; edges ease.
        float fu = clamp(u, 0.0, 1.0) * 3.0;
        float fv = clamp(v, 0.0, 1.0) * 2.0;
        float c0 = min(2.0, floor(fu));
        float r0 = min(1.0, floor(fv));
        float tu = smoothstep(0.0, 1.0, fu - c0);
        float tv = smoothstep(0.0, 1.0, fv - r0);
        int i00 = int(r0) * 4 + int(c0);
        vec3 col = mix(
          mix(biomePalette[i00].rgb, biomePalette[i00 + 1].rgb, tu),
          mix(biomePalette[i00 + 4].rgb, biomePalette[i00 + 5].rgb, tu),
          tv
        );
        return col;
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
        float moisture = underwater ? 1.0 : biomeCfg.w + mN;
        // edgeDither moves the crossfade inputs (organic borders, not contours)
        float dith = bioSimplex(wp.xz * biomeDither.x) * biomeDither.y;
        vec3 biome = bioChartColour(temperature + dith, moisture + dith);
        // photic cutoff: growth colour dies to bare sediment exactly where the
        // shared water fog curve kills the light.
        if (underwater) {
          float light = bioPhotic(-altitude, biomeWater.x, biomeWater.y);
          biome = mix(vec3(${SEDIMENT_COLOR.join(', ')}), biome, light);
        }
        // slope override OUTSIDE the chart: cliffs at any altitude/depth; cave
        // walls classify as cliffs automatically.
        #ifdef NORMAL
          // Slope vs the front-end's UP — world-up flat, RADIAL on a planet
          // (a mountainside near the pole is a cliff, not a "wall").
          float cliff = bioSlopeMask(dot(normalize(vNormalW), up), biomeDither.z, biomeDither.w);
          biome = mix(biome, vec3(${CLIFF_COLOR.join(', ')}), cliff);
        #endif
        diffuseColor = biome;
      }
      #endif`,
        };
    }
}
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