/*#
# b3d-door

**A door that opens, closes, locks and unlocks.** Walk up and press **E**
(interact), or click it: it swings open away from you, and again shuts it.
Closed, it is solid and it blocks sight, so an enemy on the far side cannot
see you.

A door with a `lock` needs a key. `hasKey(key, by)` is the game's answer to
"does this person have one", because only the game knows where its keys are
(an inventory, usually: `inv.find`, a kind in the bag). Without one the door
refuses, with the reason (`locked`) on `whenRefused` and a bubbling `refused`
event; with one it unlocks for good (`unlocked` event) and opens.

```javascript
import { b3dDoor } from 'tosijs-3d'

scene.append(
  b3dDoor({
    x: -20, z: 18, // the middle of the doorway, on the floor
    lock: 'Iron Key',
    hasKey: (key) => Object.values(inv.doc.items).some((i) => i.kind === key),
    whenRefused: ({ key }) => say(`Locked. It needs the ${key}.`),
  })
)
```

The door draws itself from boxes (a slab, a handle, and a frame unless
`frame="off"`), hinged on its left edge as you face its front (local -z).
The walls either side are the scene's. The Biped Playground has a walled yard
behind the start with a locked door; its key is in the chest beside it.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `width` | `1.2` | Metres |
| `height` | `2.2` | Metres |
| `thickness` | `0.08` | Metres |
| `color` | `'#7a5236'` | The slab |
| `trim` | `'#c9a24a'` | The handle (and a chest's lock plate) |
| `frame` | `'on'` | Draw a frame (two posts and a lintel), solid |
| `swing` | `100` | Degrees it opens, always away from whoever opens it |
| `seconds` | `0.6` | How long it takes to open or close |
| `open` | `false` | Open now (set it to open or close it from code) |
| `lock` | `''` | The key kind it needs; empty is unlocked |
| `reach` | `2` | Metres from the player within which it can be used |

## Callbacks and events

| | |
|---|---|
| `hasKey(key, by)` | Whether `by` (the player, unless an NPC says otherwise) has the key. Unset: nobody has |
| `whenOpened({ by })` / `opened` | It opened |
| `whenClosed({ by })` / `closed` | It closed |
| `whenRefused({ reason, key, by })` / `refused` | Locked and no key |
| `unlocked` event | A key unlocked it (`detail: { key, by }`) |

`use(by)` does what pressing E does, for an NPC or a script.
*/
/*{ "parent": "b3d-interactive", "order": 21 }*/

import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff, sceneDelta } from './b3d-utils.js'
import { InteractiveBehavior } from './interactive-behavior.js'
import type { B3d } from './tosi-b3d.js'

/** Whoever opens it: a biped, usually. */
export interface Opener {
  perform?: (state: string) => number
  getCameraTarget?: () => BABYLON.TransformNode | BABYLON.AbstractMesh | null
}

/**
 * What doors and chests share: a lid or leaf on a hinge, opened by `use`,
 * eased in scene time, behind a lock that asks the game for a key.
 */
export class B3dOpenable extends AbstractMesh {
  static initAttributes = {
    ...AbstractMesh.initAttributes,
    color: '#7a5236',
    trim: '#c9a24a',
    seconds: 0.6,
    open: false,
    lock: '',
    reach: 2,
  }

  declare color: string
  declare trim: string
  declare seconds: number
  declare open: boolean
  declare lock: string
  declare reach: number

  /** Does `by` have `key`? The game answers (an inventory). Unset: nobody does. */
  hasKey: ((key: string, by: unknown) => boolean) | null = null
  whenOpened: ((info: { by: unknown; contents?: string[] }) => void) | null =
    null
  whenClosed: ((info: { by: unknown }) => void) | null = null
  whenRefused:
    | ((info: { reason: string; key: string; by: unknown }) => void)
    | null = null

  /** The hinge the moving part hangs on; `_angle(t)` turns it, t 0 shut to 1 open. */
  protected _hinge: BABYLON.TransformNode | null = null
  /** The parts you can touch. */
  protected _touchable: BABYLON.AbstractMesh[] = []
  protected _t = 0
  private _use: InteractiveBehavior | null = null
  private _tick: BABYLON.Observer<BABYLON.Scene> | null = null

  /** Build `mesh`, `_hinge` and `_touchable`. */
  protected build(_scene: BABYLON.Scene): void {}

  /** Turn the hinge to `t` (0 shut, 1 open). */
  protected pose(_t: number): void {}

  /** What the `opened` event and `whenOpened` carry besides `by` (a chest's contents). */
  protected openDetail(): { contents?: string[] } {
    return {}
  }

  /** Opening, with the opener: a door picks its side, a chest plays a clip. Returns the delay before it moves, seconds. */
  protected beginOpen(_by: Opener | null): number {
    return 0
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    super.sceneReady(owner, scene)
    this.build(scene)
    if (this.mesh == null) return
    this._t = this.open ? 1 : 0
    this.pose(this._t)
    owner.register({ meshes: [this.mesh, ...this.mesh.getChildMeshes()] })
    this.followOrigin(owner)
    this._use = new InteractiveBehavior(owner, this, {
      meshes: () => this._touchable,
      reach: () => this.reach,
      reachFrom: () => {
        const p = this._player()?.getCameraTarget?.()?.getAbsolutePosition()
        return p == null ? null : { x: p.x, y: p.y, z: p.z }
      },
      highlight: () => '#ffd45e',
    })
    this._use.vetoes.push({
      name: 'locked',
      blocks: (info) => !this._keyed(info.actor ?? this._player()),
    })
    this._use.whenActivated = (info) =>
      this.use((info.actor as Opener | undefined) ?? this._player())
    this._use.whenRefused = (info) =>
      this._refuse((info.actor as Opener | undefined) ?? this._player())
    this._use.attach()
    let delay = 0
    let shown = this.open
    this._tick = scene.onBeforeRenderObservable.add(() => {
      const dt = sceneDelta(scene)
      if (this.open !== shown) {
        shown = this.open
        delay = this._pendingDelay
        this._pendingDelay = 0
      }
      if (delay > 0) {
        delay -= dt
        return
      }
      const want = this.open ? 1 : 0
      if (this._t === want) return
      const step = dt / Math.max(0.05, this.seconds)
      this._t = want > this._t ? Math.min(want, this._t + step) : Math.max(want, this._t - step)
      this.pose(ease(this._t))
    })
  }

  private _pendingDelay = 0

  private _keyed(by: unknown): boolean {
    return !this.lock || (this.hasKey?.(this.lock, by) ?? false)
  }

  private _refuse(by: unknown): void {
    const info = { reason: 'locked', key: this.lock, by }
    this.dispatchEvent(new CustomEvent('refused', { bubbles: true, detail: info }))
    this.whenRefused?.(info)
  }

  /** The player, when a focus manager is driving one. */
  protected _player(): Opener | null {
    const focus = this.owner?.querySelector('tosi-b3d-input-focus') as
      | (Element & { focused?: Opener | null })
      | null
    return focus?.focused ?? null
  }

  /** Open it if shut, shut it if open: what E does. A lock asks `hasKey` first. */
  use(by: Opener | null = this._player()): void {
    if (!this._keyed(by)) {
      this._refuse(by)
      return
    }
    if (this.lock) {
      const key = this.lock
      this.lock = ''
      this.dispatchEvent(
        new CustomEvent('unlocked', { bubbles: true, detail: { key, by } })
      )
    }
    if (this.open) {
      this.open = false
      this.dispatchEvent(new CustomEvent('closed', { bubbles: true, detail: { by } }))
      this.whenClosed?.({ by })
      return
    }
    this._pendingDelay = this.beginOpen(by)
    this.open = true
    const detail = { ...this.openDetail(), by }
    this.dispatchEvent(new CustomEvent('opened', { bubbles: true, detail }))
    this.whenOpened?.(detail)
  }

  /** A part with the scene's own look: a coloured, slightly rough box. */
  protected box(
    name: string,
    size: { width: number; height: number; depth: number },
    color: string,
    scene: BABYLON.Scene
  ): BABYLON.Mesh {
    const m = BABYLON.MeshBuilder.CreateBox(`${this.localName}-${name}`, size, scene)
    const mat = new BABYLON.StandardMaterial(`${this.localName}-${name}`, scene)
    mat.diffuseColor = BABYLON.Color3.FromHexString(color)
    mat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08)
    m.material = mat
    m.checkCollisions = true
    return m
  }

  sceneDispose(): void {
    if (this._tick != null) this.owner?.scene.onBeforeRenderObservable.remove(this._tick)
    this._tick = null
    this._use?.dispose()
    this._use = null
    this._hinge = null
    this._touchable = []
    super.sceneDispose()
  }
}

function ease(t: number): number {
  return t * t * (3 - 2 * t)
}

export class B3dDoor extends B3dOpenable {
  static preferredTagName = 'tosi-b3d-door'

  static initAttributes = {
    ...B3dOpenable.initAttributes,
    width: 1.2,
    height: 2.2,
    thickness: 0.08,
    frame: 'on' as 'on' | 'off',
    swing: 100,
  }

  declare width: number
  declare height: number
  declare thickness: number
  declare frame: 'on' | 'off'
  declare swing: number

  /** +1 swings toward local +z, -1 toward -z: away from whoever opened it. */
  private _side = 1

  protected build(scene: BABYLON.Scene): void {
    const { width: w, height: h, thickness: t } = this
    const root = new BABYLON.Mesh(`${this.localName}-root`, scene)
    this.mesh = root
    const hinge = new BABYLON.TransformNode(`${this.localName}-hinge`, scene)
    hinge.parent = root
    hinge.position.x = -w / 2
    this._hinge = hinge
    // Slightly short of the frame, so it swings without catching.
    const slab = this.box('slab', { width: w - 0.02, height: h - 0.02, depth: t }, this.color, scene)
    slab.parent = hinge
    slab.position.set(w / 2, h / 2, 0)
    const parts: BABYLON.AbstractMesh[] = [slab]
    for (const side of [-1, 1]) {
      const handle = this.box(
        `handle${side}`,
        { width: 0.14, height: 0.04, depth: 0.05 },
        this.trim,
        scene
      )
      handle.checkCollisions = false
      handle.parent = hinge
      handle.position.set(w - 0.16, 1.0, side * (t / 2 + 0.03))
      parts.push(handle)
    }
    this._touchable = parts
    if (!isOff(this.frame)) {
      const post = 0.1
      for (const side of [-1, 1]) {
        const p = this.box(`post${side}`, { width: post, height: h + post, depth: t + 0.06 }, this.color, scene)
        p.parent = root
        p.position.set(side * (w / 2 + post / 2), (h + post) / 2, 0)
      }
      const lintel = this.box('lintel', { width: w + post * 2, height: post, depth: t + 0.06 }, this.color, scene)
      lintel.parent = root
      lintel.position.set(0, h + post / 2, 0)
    }
  }

  protected beginOpen(by: Opener | null): number {
    // Away from the opener: which side of the doorway are they on?
    const p = by?.getCameraTarget?.()?.getAbsolutePosition()
    if (p != null && this.mesh != null) {
      const local = BABYLON.Vector3.TransformCoordinates(
        p,
        this.mesh.getWorldMatrix().clone().invert()
      )
      this._side = local.z < 0 ? 1 : -1
    }
    return 0
  }

  protected pose(t: number): void {
    if (this._hinge == null) return
    this._hinge.rotationQuaternion = null
    this._hinge.rotation.y = -this._side * t * this.swing * (Math.PI / 180)
  }
}

export const b3dDoor = B3dDoor.elementCreator()
