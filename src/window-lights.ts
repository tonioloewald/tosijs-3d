/*#
# window-lights

**Lit windows at night.** A material plugin that finds a building's window
glass by its colour and lights some of the rooms behind it: warm lamplight
mostly, now and then the blue of a screen. Which rooms are lit is a hash of
where they are, so a room stays lit or dark as you drive past.

Every room has a **habit**, from the same hash, and keeps it:

| Habit | Share | Lit |
|-------|-------|-----|
| always dark | 15% | never (empty, or nobody home) |
| night owl | 30% | 7 pm to 2 am |
| early riser | 20% | 5 to 8 am, and 6 to 10 pm |
| evening | 17% | 5.30 to 11.30 pm |
| bathroom | 18% | a few minutes now and then, any hour of the night |

Each room keeps its own hours up to an hour either side, so a street does not
switch at once. Together: busiest around ten, rare after midnight, back up
from five as people get up. Nothing shows by day. [b3d-city](/b3d-city/) puts
it on Kenney's buildings.

```javascript
const lights = windowLights(material, { origin: cityRoot })
// every frame:
lights.hour = skybox.timeOfDay
lights.glow = darkness // 0 by day, 1 at night
```

The glass is any texel distinctly blue: Kenney's city kits draw their windows
from one light blue. A room is `room` metres across (default 4 × 3 × 4: a
couple of windows, one storey).
*/
/*{ "parent": "terrain", "order": 63 }*/

import * as BABYLON from '@babylonjs/core'

/**
 * Whether a room with this habit has its light on at `hour`. `habit` and
 * `shift` are the room's own (0 to 1; the shader takes them from the room's
 * hash), `roll` a fresh 0 to 1 per few minutes of the clock (the bathroom).
 * The shader mirrors this; it is here so the habits can be tested.
 */
export function roomLit(habit: number, shift: number, hour: number, roll: number): boolean {
  const h = (((hour - (shift - 0.5) * 2) % 24) + 24) % 24
  if (habit < 0.15) return false
  if (habit < 0.45) return h >= 19 || h < 2
  if (habit < 0.65) return (h >= 5 && h < 8) || (h >= 18 && h < 22)
  if (habit < 0.82) return h >= 17.5 && h < 23.5
  return roll < 0.1
}

export class WindowLightsPlugin extends BABYLON.MaterialPluginBase {
  /** The time of day, hours. */
  hour = 12
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
    uniformBuffer.updateFloat4('winState', this.hour, this.glow, 0, 0)
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
        float wGlow = winState.y;
        vec3 wRoom = floor((vPositionW - winOrigin.xyz) / winRoom.xyz) + winRoom.w;
        // The room's habit (roomLit, mirrored): kept for good.
        float wHabit = b3dWinHash(wRoom);
        float wH = mod(winState.x - (b3dWinHash(wRoom * 3.7 + 1.1) - 0.5) * 2.0, 24.0);
        float wLit = 0.0;
        if (wHabit < 0.15) wLit = 0.0;
        else if (wHabit < 0.45) wLit = (wH >= 19.0 || wH < 2.0) ? 1.0 : 0.0;
        else if (wHabit < 0.65) wLit = ((wH >= 5.0 && wH < 8.0) || (wH >= 18.0 && wH < 22.0)) ? 1.0 : 0.0;
        else if (wHabit < 0.82) wLit = (wH >= 17.5 && wH < 23.5) ? 1.0 : 0.0;
        else wLit = b3dWinHash(wRoom + floor(winState.x * 20.0) * 0.37) < 0.1 ? 1.0 : 0.0;
        float wOn = wGlass * wLit * wGlow;
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
