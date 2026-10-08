/*
The water material's side of `water-shore`: Babylon's WaterMaterial takes no
material plugins, so its shader is patched in the shader store, the way
b3d-skybox forks the sky. Everything added is behind `#ifdef VERTEXCOLOR`, so a
water mesh without shore data compiles exactly the stock shader.

ONE THING IS TAKEN AWAY: stock water multiplies its colour by the vertex
colour. With shore data in that attribute the multiply would tint the sea by
its own depth, so it is removed. A vertex colour on a water mesh now MEANS
shore data: r = depth in metres (negative above the waterline), g = ice cover,
b = how solid a full sheet is.
*/
import * as BABYLON from '@babylonjs/core'
// The material loads its shader on demand; the patch needs the text NOW, so
// it is pulled in here (the module's side effect fills the shader store).
import '@babylonjs/materials/water/water.fragment.js'

const MARK = '/*b3dShore*/'

const FUNCTIONS = `
float b3dShoreHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float b3dShoreNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(b3dShoreHash(i), b3dShoreHash(i + vec2(1.0, 0.0)), f.x),
    mix(b3dShoreHash(i + vec2(0.0, 1.0)), b3dShoreHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
// Plates: x = distance to the edge of this plate (0 at a crack), y = a
// number of its own, 0..1.
vec2 b3dShorePlates(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float d1 = 9.0;
  float d2 = 9.0;
  float id = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(b3dShoreHash(cell + g), b3dShoreHash(cell + g + 19.19));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = b3dShoreHash(cell + g + 7.7); }
      else if (d < d2) { d2 = d; }
    }
  }
  return vec2(d2 - d1, id);
}
// The plate pattern at a world position: x = how much of a plate is here
// (0 in a gap), y = that plate's own number. ONE definition, used by the
// surface and by its underside, so the two agree plate for plate.
vec2 b3dShoreIce(vec2 xz, float ice) {
  vec2 p = b3dShorePlates(xz * 0.085 + 0.6 * vec2(b3dShoreNoise(xz * 0.03), b3dShoreNoise(xz * 0.03 + 5.0)));
  float there = step(p.y, ice * 1.08);
  float gap = mix(0.3, 0.012, smoothstep(0.25, 1.0, ice));
  return vec2(there * smoothstep(gap, gap + 0.035, p.x), p.y);
}
`

const DEFINITIONS = `${MARK}
#ifdef VERTEXCOLOR
${FUNCTIONS}
#endif
`

const SHORE = `${MARK}
#ifdef VERTEXCOLOR
{
  float b3dDepth = vColor.r;
  float b3dIce = clamp(vColor.g, 0.0, 1.0);
  vec2 b3dXZ = vPositionW.xz;
  // SHALLOWS: paler and greener toward the beach.
  float b3dShallow = 1.0 - smoothstep(0.0, 7.0, b3dDepth);
  color.rgb = mix(color.rgb, color.rgb * 1.12 + vec3(0.03, 0.09, 0.08), 0.55 * b3dShallow);
  // FOAM: a thin wash that laps in and out over the last half metre, and a
  // line riding out ahead of it. Kept FAINT, and never still: two laps out of
  // step, and grain that streams along the shore, so no patch of it sits.
  float b3dLap = 0.5 + 0.3 * sin(time * 1.9 + b3dXZ.x * 0.21 + b3dXZ.y * 0.17)
    + 0.2 * sin(time * 3.1 - b3dXZ.x * 0.13 + b3dXZ.y * 0.29);
  vec2 b3dFlow = vec2(time * 0.9, -time * 0.6);
  float b3dGrain = 0.6 * b3dShoreNoise(b3dXZ * 1.7 + b3dFlow)
    + 0.4 * b3dShoreNoise(b3dXZ * 3.9 - b3dFlow * 1.4);
  float b3dWash = 1.0 - smoothstep(0.03, 0.2 + 0.45 * b3dLap, b3dDepth + 0.25 * b3dGrain);
  float b3dLineAt = 0.6 + 0.9 * b3dLap;
  float b3dLine = (1.0 - smoothstep(0.0, 0.25, abs(b3dDepth - b3dLineAt))) * smoothstep(0.45, 0.8, b3dGrain);
  float b3dFoam = clamp(b3dWash * (0.3 + 0.35 * b3dGrain) + 0.28 * b3dLine, 0.0, 0.7);
  /*
  ICE, in three states that run into each other as the cover falls: a SHEET
  (every plate present, hairline cracks), BROKEN plates (some missing, the
  rest pulling apart), and OPEN water. One plate pattern serves all three:
  a plate is there if its own number is under the cover, and the gap around
  it widens as the cover drops.
  */
  float b3dPlate = 0.0;
  float b3dId = 0.0;
  if (b3dIce > 0.0) {
    vec2 b3dP = b3dShoreIce(b3dXZ, b3dIce);
    // SOLID: in real cold the plates knit into one surface. The cracks
    // close and the plate-to-plate difference in white goes with them.
    float b3dSolid = clamp(vColor.b, 0.0, 1.0);
    b3dPlate = mix(b3dP.x, 1.0, b3dSolid);
    b3dId = mix(b3dP.y, 0.6, b3dSolid);
  }
  vec3 b3dLight = diffuseBase + vec3(0.32, 0.35, 0.4);
  // Each plate a slightly different white; a little snow-grain on top.
  vec3 b3dIceCol = mix(vec3(0.74, 0.84, 0.9), vec3(0.95, 0.97, 1.0), b3dId)
    * (0.93 + 0.07 * b3dShoreNoise(b3dXZ * 2.3));
  color.rgb = mix(color.rgb, vec3(0.96, 0.98, 1.0), b3dFoam * (1.0 - b3dIce));
  color.rgb = mix(color.rgb, b3dIceCol * min(b3dLight, vec3(1.15)), b3dPlate);
}
#endif
`

/**
 * Patch the water shader once. Returns false (and changes nothing) if
 * Babylon's shader no longer has the shape this expects — the water then
 * simply has no shoreline, rather than a broken material.
 */
export function registerShoreWater(): boolean {
  const store = BABYLON.ShaderStore.ShadersStore as Record<string, string>
  const frag = store.waterPixelShader
  if (frag == null) return false
  if (frag.includes(MARK)) return true
  const tint = 'baseColor.rgb*=vColor.rgb;'
  const defs = '#define CUSTOM_FRAGMENT_DEFINITIONS'
  const compose = 'vec4 color=vec4(finalDiffuse+finalSpecular,alpha);'
  if (
    !frag.includes(tint) ||
    !frag.includes(defs) ||
    !frag.includes(compose) ||
    !frag.includes('uniform float time;')
  )
    return false
  store.waterPixelShader = frag
    .replace(tint, '')
    .replace(defs, defs + '\n' + DEFINITIONS)
    .replace(compose, compose + '\n' + SHORE)
  return true
}

/**
 * The ice seen from BELOW, on the water's underside (a StandardMaterial, so a
 * plugin serves). Same plates as the surface, read from the same vertex data:
 * each one a pale slab with the day glowing through it, and the usual window
 * onto the sky in the gaps between.
 */
export class IceUndersidePlugin extends BABYLON.MaterialPluginBase {
  constructor(material: BABYLON.Material) {
    super(material, 'IceUnderside', 220, { ICEUNDER: false })
    this._enable(true)
  }

  prepareDefines(defines: BABYLON.MaterialDefines): void {
    defines.ICEUNDER = true
  }

  getClassName(): string {
    return 'IceUndersidePlugin'
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#if defined(ICEUNDER) && defined(VERTEXCOLOR)
        ${FUNCTIONS}
      #endif`,
      /*
      The vertex colour here is DATA (depth, ice), and a StandardMaterial
      multiplies its base colour by it: the whole underside came out red
      (depth 1, ice 0.6, 0). Put the base colour back.
      */
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `#if defined(ICEUNDER) && defined(VERTEXCOLOR)
        baseColor.rgb = vec3(1.0);
      #endif`,
      CUSTOM_FRAGMENT_MAIN_END: `#if defined(ICEUNDER) && defined(VERTEXCOLOR)
      {
        float b3dIce = clamp(vColor.g, 0.0, 1.0);
        if (b3dIce > 0.0) {
          vec2 b3dP = b3dShoreIce(vPositionW.xz, b3dIce);
          float b3dSolid = clamp(vColor.b, 0.0, 1.0);
          b3dP = mix(b3dP, vec2(1.0, 0.45), b3dSolid);
          // Thinner at a plate's number's low end: more light comes through.
          vec3 b3dSlab = mix(vec3(0.3, 0.56, 0.62), vec3(0.7, 0.9, 0.92), b3dP.y)
            * (0.9 + 0.1 * b3dShoreNoise(vPositionW.xz * 1.3));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, b3dSlab, 0.92 * b3dP.x);
        }
      }
      #endif`,
    }
  }
}
