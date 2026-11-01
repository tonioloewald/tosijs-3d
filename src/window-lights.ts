/*#
# window-lights

**Lit windows at night.** A material plugin that finds a building's window
glass by its colour and lights some of the rooms behind it: warm lamplight
mostly, now and then the blue of a screen. Which rooms are lit is a hash of
where they are, so a room stays lit or dark as you drive past, and as the
evening goes on rooms go dark one at a time rather than all at once.

How many are lit follows the clock (`windowsLit(hour)`): rising through the
evening to a peak around ten, rare after midnight, back up from five as people
get up, and none by day. [b3d-city](/b3d-city/) puts it on Kenney's buildings.

```javascript
const lights = windowLights(material, { origin: cityRoot })
// every frame:
lights.lit = windowsLit(skybox.timeOfDay)
lights.glow = darkness // 0 by day, 1 at night
```

The glass is any texel distinctly blue (Kenney's city kits draw their windows
from one light blue); `isGlass` takes another rule for another kit. A room is
`room` metres across (default 4 × 3 × 4: a couple of windows, one storey).
*/
/*{ "parent": "terrain", "order": 63 }*/

import * as BABYLON from '@babylonjs/core'

/*
The share of rooms lit through the day, by hour: [hour, share]. Read round
the clock, linearly between.
*/
const OCCUPANCY: [number, number][] = [
  [0, 0.16],
  [1, 0.07],
  [3, 0.04],
  [4.5, 0.06],
  [5, 0.18],
  [6, 0.32],
  [7.5, 0.25],
  [9, 0.1],
  [16, 0.1],
  [18, 0.35],
  [20, 0.5],
  [22, 0.6],
  [23, 0.4],
]

/** The share of rooms with a light on at `hour` (0 to 24). */
export function windowsLit(hour: number): number {
  const h = ((hour % 24) + 24) % 24
  for (let i = 0; i < OCCUPANCY.length; i++) {
    const [h0, v0] = OCCUPANCY[i]
    const [h1, v1] = i + 1 < OCCUPANCY.length ? OCCUPANCY[i + 1] : [OCCUPANCY[0][0] + 24, OCCUPANCY[0][1]]
    if (h >= h0 && h < h1) return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0)
  }
  return OCCUPANCY[0][1]
}

export class WindowLightsPlugin extends BABYLON.MaterialPluginBase {
  /** The share of rooms lit, 0 to 1. */
  lit = 0
  /** How bright a lit window is, 0 by day to 1 at night. */
  glow = 0
  /** A room's size, metres. */
  room = new BABYLON.Vector3(4, 3, 4)
  /** Rooms are counted from here (the city's root), so a floating-origin shift does not relight them. */
  origin: BABYLON.TransformNode | null = null
  /** A different set of rooms for the same city. */
  seed = 0
  private _isEnabled = false

  constructor(material: BABYLON.Material) {
    super(material, 'WindowLights', 240, { WINLIGHTS: false })
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
    defines.WINLIGHTS = this._isEnabled
  }

  getClassName(): string {
    return 'WindowLightsPlugin'
  }

  getUniforms(): { ubo: { name: string; size: number; type: string }[]; fragment: string } {
    return {
      ubo: [
        { name: 'winRoom', size: 4, type: 'vec4' },
        { name: 'winOrigin', size: 4, type: 'vec4' },
        { name: 'winState', size: 4, type: 'vec4' },
      ],
      fragment: `#ifdef WINLIGHTS
        uniform vec4 winRoom;
        uniform vec4 winOrigin;
        uniform vec4 winState;
      #endif`,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    if (!this._isEnabled) return
    const r = this.room
    uniformBuffer.updateFloat4('winRoom', r.x, r.y, r.z, this.seed)
    const o = this.origin?.position
    uniformBuffer.updateFloat4('winOrigin', o?.x ?? 0, o?.y ?? 0, o?.z ?? 0, 0)
    uniformBuffer.updateFloat4('winState', this.lit, this.glow, 0, 0)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef WINLIGHTS
        float b3dWinGlow = 0.0;
        vec3 b3dWinColour = vec3(0.0);
        float b3dWinHash(vec3 p) {
          p = fract(p * vec3(0.1031, 0.1030, 0.0973));
          p += dot(p, p.yxz + 33.33);
          return fract((p.x + p.y) * p.z);
        }
      #endif`,
      CUSTOM_FRAGMENT_UPDATE_ALBEDO: `#if defined(WINLIGHTS) && defined(ALBEDO)
      {
        vec3 wT = albedoTexture.rgb;
        #ifndef GAMMAALBEDO
          wT = toGammaSpace(wT);
        #endif
        // Window glass: distinctly blue.
        float wGlass = step(0.35, wT.b - wT.r) * step(0.6, wT.b);
        float wLit = winState.x;
        float wGlow = winState.y;
        vec3 wRoom = floor((vPositionW - winOrigin.xyz) / winRoom.xyz) + winRoom.w;
        float wOn = wGlass * step(b3dWinHash(wRoom), wLit) * wGlow;
        float wKind = b3dWinHash(wRoom * 1.7 + 3.1);
        b3dWinColour = wKind > 0.85 ? vec3(0.45, 0.6, 1.0) : mix(vec3(1.0, 0.72, 0.38), vec3(1.0, 0.86, 0.6), wKind);
        b3dWinGlow = wOn * (0.7 + 0.5 * b3dWinHash(wRoom * 2.3 + 1.3));
        // A lit room's glass shows the room, not the sky.
        surfaceAlbedo *= 1.0 - 0.8 * wOn;
      }
      #endif`,
      CUSTOM_FRAGMENT_BEFORE_FOG: `#ifdef WINLIGHTS
        finalColor.rgb += b3dWinColour * b3dWinGlow;
      #endif`,
    }
  }
}

/** Light the windows of a building material (the plugin, enabled). */
export function windowLights(
  material: BABYLON.Material,
  options: { origin?: BABYLON.TransformNode; room?: BABYLON.Vector3; seed?: number } = {}
): WindowLightsPlugin {
  const plugin =
    (material.pluginManager?.getPlugin('WindowLights') as WindowLightsPlugin | null) ?? new WindowLightsPlugin(material)
  if (options.origin) plugin.origin = options.origin
  if (options.room) plugin.room.copyFrom(options.room)
  if (options.seed != null) plugin.seed = options.seed
  plugin.isEnabled = true
  return plugin
}
