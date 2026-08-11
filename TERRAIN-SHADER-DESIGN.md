# Procedural Terrain Shader — Plan

A tosijs-3d shader component for dynamic terrain: biome classification via a
computed-axes picker over an array-atlas, world-space evaluation throughout, one
shader spanning seafloor → beach → mountain. Manta is the first consumer (and the
close-range stress test); a planetary front-end is kept open as interface, not
implementation.

## Architecture: one picker, two front-ends

Core component: **`position → (u,v)` into a biome chart**, plus shared sampling
machinery. Front-ends compute the chart axes:

```
// Shared chart axes (Whittaker convention: u = temperature, v = moisture)
temperature = base − lapseRate × altitude + tNoise      // altitude = worldY − seaLevel
moisture    = moistureTerm + mNoise

// Manta front-end (v1 — the only one implemented)
underwater:  moisture = 1.0
             temperature falls with depth (lapse term keeps running below sea level)
above water: moisture = mapConstant
→ the seafloor gradient is the max-moisture COLUMN of the 2D chart:
  surface reef → shelf → abyssal = warm→cold along the wet edge;
  the beach is where the terrestrial chart meets the marine edge at sea level.

// Planetary front-end (interface only — a stub + test, no baked pipelines)
temperature += insolation(latitudeWarped, tilt, planetBase)
moisture     = moistureField(position)   // f(distance-to-ocean)+noise at minimum
latitude     = asin(normalize(p).y)      // 3D position, never lat/long UVs
altitude     = length(p) − seaRadius     // RADIAL — the planet's "worldY − seaLevel"
```

**Separate local override terms, outside the chart** (as in the original Unity shader):

- **Slope**: `dot(normal, up)` → cliff/barren mask at any latitude/depth. Cave and
  tunnel walls classify as cliffs automatically — semantically right, nothing grows there.
- **Light (Manta-critical)**: photic cutoff for kelp/coral/seagrass → bare sediment.
  MUST share the same depth-attenuation curve as the underwater lighting/fog, so
  growth visibly stops exactly where light dies. Coherence for free.

## Biome chart & atlas

- **Whittaker layout**: fill the grid so adjacent cells are ecologically adjacent
  (jungle→savanna→desert; never jungle→tundra). Blend plausibility comes from atlas
  _organization_, not just dithering.
- **`TEXTURE_2D_ARRAY`, not a packed grid** (WebGL2/Babylon). One layer per biome
  (albedo + normal arrays). Kills both classic atlas artifacts: mip bleed across
  cell edges and `fract()`-tiling derivative seams. Layer index can't interpolate
  into a neighbor. Blender addon emits the array from the same per-biome source
  squares — the authoring convention survives, only packing changes.
- **Blend cost**: honest version samples 4 biomes (both neighbors on both axes),
  bilinear via smoothstep on the fractional parts — 8–12 fetches with normals.
  Fine on modern mobile; the 2-nearest + noise-dither diagonal is the fallback
  economy if profiling demands it. **Four bands visible per fragment max; keep
  total layer count modest** — fog/water attenuation hides distant detail anyway.

## Noise components (the inventory)

All noise evaluated in **world space, `highp`** (mediump world coords on mobile
GPUs → shimmer). Base implementations: Ashima/webgl-noise or IQ's — accept that
frequencies won't match Blender's nodes; tune by eye against the EEVEE look-dev,
don't chase pixel parity.

| Noise                 | Type                                                                    | Purpose                                                                | Frequency regime |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------- |
| `tNoise`              | fBm simplex, 2–3 octaves                                                | temperature microclimate; breaks band edges                            | medium           |
| `mNoise`              | fBm simplex, 2–3 octaves                                                | moisture patchiness                                                    | medium           |
| `edgeDither`          | single-octave simplex                                                   | dithers the 4-way biome crossfade so borders are organic, not contours | high             |
| `latWarp` (planetary) | low-freq simplex, domain-warps latitude **before** the temperature calc | gulf-stream wobble; kills painted-on banding                           | very low         |
| `tileHash`            | hash of per-repeat cell ID                                              | stochastic tiling: per-cell rotation/offset + boundary blend           | per-repeat       |
| `detailBreakup`       | optional 1-octave                                                       | macro-variation multiplier on albedo to hide repeat at mid-distance    | low              |

Notes:

- Noise feeds the **inputs** (temperature/moisture/latitude), never post-classification
  — warping after classification produces smeared texels, not moved boundaries.
- **Stochastic tiling** is a bolt-on to the sampling function (hash cell → rotate/offset
  UVs, blend near cell boundaries), ~2× fetch cost on layers where it's enabled.
  Enable on large flat biomes (abyssal plains, desert); skip on busy ones.
- Budget: the whole noise stack is ~4–6 simplex evaluations per fragment before
  texture fetches. Profile on mid-range mobile Safari before adding octaves.

## Sampling

- **World-space everywhere** → tile seams are impossible by construction: adjacent
  tiles (heightfield or authored mesh) shade continuously with zero edge coordination.
  Generated terrain gets correct shading for free — the shader doesn't know where
  the heightfield came from.
- **Triplanar** (3-axis sample, normal-weighted blend) for authored tiles with walls/
  ceilings (caves, tunnels, bridges) and for any spherical/planetary surface — also
  resolves the pole singularity (hairy-ball) since biome logic uses 3D position and
  only detail mapping needs charts. 3× fetch cost; heightfield tiles can use the
  cheap top-down projection path. One shader, both paths, hybrid question dissolved.
- **AO/cavity**: no scene access in fragment shaders. Bake per-tile cavity maps in
  Blender (static per tile even when tile _placement_ is dynamic) or approximate
  slope+noise. Do not attempt to port Blender AO/bevel/light-path nodes.

## Workflow

EEVEE is **look-dev, not source**: art-direct bands, palette, noise scales where
iteration is fast; treat the graph as a spec; hand-port once (~a screenful of GLSL).
After the port, tuning moves to WebGL with live uniforms — no round-tripping.

## Build order

1. Classification skeleton: altitude/depth → temperature column, moisture constant,
   slope override. Flat-color biomes (no textures) to validate the chart mapping.
2. Array-atlas sampling + 4-way crossfade + `edgeDither`. Manta palette (abyssal →
   shelf → reef → beach → grass → rock → snow).
3. Light/photic term wired to the shared attenuation curve.
4. Stochastic tiling on abyssal/plain layers.
5. Triplanar path; verify seam continuity heightfield↔cave tile.
6. `highp`/precision + fetch-count profiling pass on mid-range mobile Safari.
7. Planetary front-end stub (insolation + latWarp + moisture-field signature) with
   a test — **interface kept open, nothing more**. The test for any further planetary
   work: does Manta's seafloor need it? If no, it waits.

## Scope guard

Manta needs: world-space eval, array-atlas, wet-column gradient, photic cutoff,
slope override, stochastic tiling, triplanar. Manta does not need: latitude/insolation,
moisture fields, planet parameter blocks, rain-shadow bakes. Those exist only as the
stub in step 7. Planets inherit a battle-tested shader later; Manta ships first.

---

## Implementation status (living)

- **2026-08-11** — steps **1 + 3 + 7** landed: pure model `biome-chart.ts`
  (chart axes both front-ends, uv/cell blend, slope override, photic term
  sharing b3d-water's EXP2 density formula; unit-tested), GLSL plugin
  `biome-plugin.ts` (flat-color chart + fBm axis noise + edgeDither + slope +
  photic; `MaterialPluginBase` on the terrain material so scene
  fog/shadows/lighting compose), `b3d-terrain` gains `biome="on"`. Planetary
  axes are the stub + tests (radial altitude, asin-latitude, insolation
  signature) — interface only, per the scope guard.
- Steps 2 (array atlas), 4 (stochastic tiling), 5 (triplanar), 6 (mobile
  profiling) — not started; step 2 is next and needs the Blender-addon array
  emit from the content side.
