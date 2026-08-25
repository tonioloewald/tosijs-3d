/*#
# b3d-interactive

**Makes a mesh touchable.** Point at it, reach it, use it — and it tells you, by
callback or by bubbling event. It is the substrate doors, knobs, switches,
levers, consoles and lamps all stand on; the rules it enforces are pure and
tested in [interaction](?interaction.ts), and the scene bridge is
[interactive-behavior](?interactive-behavior.ts).

`b3d-button` is a floating Babylon GUI widget. This is the other thing: *world
geometry you reach out to*.

## Demo

```js
import { b3d, b3dBox, b3dSphere, b3dGround, b3dLight, b3dSkybox, b3dInteractive } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi, elements } from 'tosijs'
const { div, p, span } = elements

const { demo } = tosi({ demo: { status: 'Click a brass knob.', key: 'no key' } })

// Two sliding doors. Each is a BOX plus a KNOB, and the interactive targets the
// KNOB — the sub-mesh you actually touch, not the whole panel. Knobs sit at -z
// because the default camera is on that side; a knob on the far face is behind
// its own door and unpickable, which reads as "the interactive is broken".
const doorL = b3dBox({ meshName: 'doorL', width: 1.6, height: 2.4, depth: 0.14, x: -2.2, y: 1.2, color: '#7a5236' })
const knobL = b3dSphere({ meshName: 'knobL', diameter: 0.22, x: -1.55, y: 1.2, z: -0.14, color: '#d9a441' })
const doorR = b3dBox({ meshName: 'doorR', width: 1.6, height: 2.4, depth: 0.14, x: 2.2, y: 1.2, color: '#7a5236' })
const knobR = b3dSphere({ meshName: 'knobR', diameter: 0.22, x: 1.55, y: 1.2, z: -0.14, color: '#b0483c' })

// A key on a plinth. Picking it up is just another interactive.
const key = b3dBox({ meshName: 'key', width: 0.35, height: 0.1, depth: 0.1, x: 0, y: 1.05, z: -0.1, color: '#ffd45e', glow: 0.8 })
const plinth = b3dBox({ meshName: 'plinth', width: 0.6, height: 1, depth: 0.6, x: 0, y: 0.5, color: '#555a60' })

// A lamp and its switch — the same primitive doing something that isn't a door.
const ambient = b3dLight({ y: 1, intensity: 0.35 })
const lamp = b3dSphere({ meshName: 'lamp', diameter: 0.5, x: 0, y: 3.2, color: '#332a12', glow: 0.1 })
const post = b3dBox({ meshName: 'post', width: 0.12, height: 1.3, depth: 0.12, x: 0.9, y: 0.65, z: -0.9, color: '#4b5057' })
const lampSwitch = b3dBox({ meshName: 'switch', width: 0.3, height: 0.4, depth: 0.12, x: 0.9, y: 1.35, z: -0.9, color: '#c8ccd0' })

let hasKey = false
let openL = 0, wantL = 0, openR = 0, wantR = 0, lit = false

// LEFT door: unlocked. Note it moves the ELEMENT (`x`), never `mesh.position` —
// an element that manages a node owns its transform, so writing the mesh is
// undone on the next render.
const useL = b3dInteractive({
  target: 'knobL',
  whenActivated: () => { wantL = wantL ? 0 : 1; demo.status.value = wantL ? 'Left door opening.' : 'Left door closing.' },
})

// RIGHT door: locked, by COMPOSITION. `lockable` is a veto on the same piece —
// the interactive never learns what a lock is, and a refusal names the refuser.
const useR = b3dInteractive({
  target: 'knobR',
  whenActivated: () => { wantR = wantR ? 0 : 1; demo.status.value = wantR ? 'Right door opening.' : 'Right door closing.' },
  whenRefused: (info) => { demo.status.value = `It will not budge — ${info.reason}.` },
})
useR.vetoes.push({ name: 'locked', blocks: () => !hasKey })

const takeKey = b3dInteractive({
  target: 'key',
  whenActivated: () => {
    hasKey = true
    demo.key.value = 'brass key'
    demo.status.value = 'You take the key. The red knob will turn now.'
    key.remove()
    // Material, not placement — b3d-primitives build their material once, so a
    // live recolour goes through the material rather than the `color` attribute.
    knobR.mesh.material.diffuseColor.set(0.85, 0.64, 0.25)
  },
})

const flick = b3dInteractive({
  target: 'switch',
  whenActivated: () => {
    lit = !lit
    ambient.intensity = lit ? 1.1 : 0.35
    lamp.mesh.material.emissiveColor.set(lit ? 1 : 0.1, lit ? 0.94 : 0.08, lit ? 0.72 : 0.04)
    demo.status.value = lit ? 'Lamp on.' : 'Lamp off.'
  },
})

// Cosmetic easing only — the doors slide by writing their elements' x.
setInterval(() => {
  openL += (wantL - openL) * 0.12
  openR += (wantR - openR) * 0.12
  doorL.x = -2.2 - openL * 1.55; knobL.x = -1.55 - openL * 1.55
  doorR.x = 2.2 + openR * 1.55; knobR.x = 1.55 + openR * 1.55
}, 16)

preview.append(
  b3d(
    {
      glowLayerIntensity: 0.7,
      sceneCreated(el) {
        orbitCam(el, { alphaDeg: -90, betaDeg: 68, radius: 11, target: [0, 1.2, 0] })
      },
    },
    ambient,
    b3dSkybox({ timeOfDay: 17 }),
    b3dGround({ size: 30, color: '#4a4f45' }),
    doorL, knobL, doorR, knobR, plinth, key, lamp, post, lampSwitch,
    useL, useR, takeKey, flick,
  ),
  div(
    { style: 'position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:14px monospace' },
    p('Hover highlights. Press and release ON a thing to use it.'),
    span({ bindText: demo.status }),
    p({ style: 'opacity:0.7' }, 'carrying: ', span({ bindText: demo.key })),
  )
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `target` | `''` | Mesh or node name to make touchable. Empty = the mesh of the element this one is nested inside |
| `include` | `'subtree'` | `'subtree'` counts the named node and everything under it; `'self'` counts only the node itself |
| `reach` | `0` | Max distance in world units; `0` means no limit |
| `disabled` | `false` | Refuses hover, and drops a press already in flight |
| `highlight` | `'#ffcc44'` | Hover outline colour; `'none'` for no highlight |

## Events and callbacks

Every one carries `{ mesh, point, distance }`; `refused` adds `reason`.

| Event | Callback prop | When |
|---|---|---|
| `hover` | `whenHovered` | The pointer arrived (and is in reach) |
| `unhover` | `whenUnhovered` | It left, or the thing was disabled under it |
| `activate` | `whenActivated` | A press that started AND ended on it, with no veto |
| `refused` | `whenRefused` | The same press, but a veto said no |

Callbacks are named `whenX`, not `onX`, on purpose: `elementCreator` treats any
`on*` prop as a DOM event listener, so an `onActivate` prop would silently become
`addEventListener('activate')` and your function would never be called.

## Composing other features onto it

Push a veto and something else on the same piece can refuse an activation
without either feature knowing the other exists:

```javascript
import { b3dInteractive } from 'tosijs-3d'

const use = b3dInteractive({ target: 'hatch' })
use.vetoes.push({ name: 'powered', blocks: () => !reactor.online })
use.vetoes.push({ name: 'locked', blocks: () => !player.has('hatch-key') })
```

The first refuser's name comes back on the `refused` event, which is the
difference between a locked door and a broken one.

## Reaching it without pointing at it

`useNearest(scene, position)` activates the closest thing within its own reach —
the "walk up and press E" control, for wiring to `ControlInput.interact`:

```javascript
import { useNearest } from 'tosijs-3d'
if (input.interact) useNearest(scene, camera.globalPosition)
```
*/
/*{ "parent": "World Sim" }*/
import * as BABYLON from '@babylonjs/core'
import { B3dChild, semanticParent } from './b3d-utils'
import type { B3d } from './tosi-b3d'
import {
  InteractiveBehavior,
  type InteractionInfo,
} from './interactive-behavior'

export class B3dInteractive extends B3dChild {
  static styleSpec = {
    ':host': {
      display: 'none',
    },
  }

  static initAttributes = {
    /** Mesh/node name. Empty = the mesh of the element this is nested inside. */
    target: '',
    /** `'subtree'` (the node and its children) or `'self'`. */
    include: 'subtree',
    /** Max distance in world units; 0 = no limit. */
    reach: 0,
    // `disabled`, not `active` — an absent boolean attribute is false, so a
    // default-true boolean could never turn on (and tosijs now throws on one).
    disabled: false,
    /** Hover outline colour, or `'none'`. */
    highlight: '#ffcc44',
  }

  declare target: string
  declare include: string
  declare reach: number
  declare disabled: boolean
  declare highlight: string

  owner: B3d | null = null

  whenActivated: ((info: InteractionInfo) => void) | null = null
  whenHovered: ((info: InteractionInfo) => void) | null = null
  whenUnhovered: ((info: InteractionInfo) => void) | null = null
  whenRefused: ((info: InteractionInfo) => void) | null = null

  /**
   * Other features' refusals — see the doc above. Lives on the element (not
   * behind the behaviour) so a `lockable` can be pushed before the scene is up.
   */
  vetoes: Array<{ name: string; blocks: () => boolean }> = []

  private _behavior: InteractiveBehavior | null = null
  private _cache: BABYLON.AbstractMesh[] | null = null

  content = () => ''

  sceneReady(owner: B3d, _scene: BABYLON.Scene) {
    this.owner = owner
    const attrs = this as any
    const behavior = new InteractiveBehavior(owner, this, {
      meshes: () => this._meshes(),
      reach: () => attrs.reach,
      enabled: () => !attrs.disabled,
      highlight: () => attrs.highlight,
    })
    behavior.vetoes = this.vetoes
    // Forward to the element's own props so a consumer can reassign them later.
    behavior.whenActivated = (info) => this.whenActivated?.(info)
    behavior.whenHovered = (info) => this.whenHovered?.(info)
    behavior.whenUnhovered = (info) => this.whenUnhovered?.(info)
    behavior.whenRefused = (info) => this.whenRefused?.(info)
    behavior.attach()
    this._behavior = behavior
  }

  sceneDispose() {
    this._behavior?.dispose()
    this._behavior = null
    this._cache = null
    this.owner = null
  }

  /** Is the pointer on it right now? */
  get hovered(): boolean {
    return this._behavior?.hovered ?? false
  }

  /** True when nothing refuses an activation — i.e. using it would do something. */
  get operable(): boolean {
    return this._behavior?.operable ?? false
  }

  /** Use it without pointing at it (a key press, an NPC, a test). */
  activate(info?: Partial<InteractionInfo>): boolean {
    return this._behavior?.activate(info) ?? false
  }

  /**
   * Tuned state for the console / `hj eval`. Says whether the target NAME
   * resolved, which is the one thing that silently makes an interactive inert.
   */
  get debugState() {
    const attrs = this as any
    const meshes = this._meshes()
    return {
      target: attrs.target || '(nested parent)',
      resolved: meshes.length > 0,
      ...(this._behavior?.debugState ?? { attached: false }),
    }
  }

  /**
   * The meshes that count as "this thing".
   *
   * Cached, because a pointer move fires on every frame the mouse is in motion
   * and `getChildMeshes` allocates — but re-resolved whenever the cache is empty
   * or anything in it has been disposed, so a GLB that loads late starts working
   * when it arrives instead of never.
   */
  private _meshes(): BABYLON.AbstractMesh[] {
    const cache = this._cache
    if (cache && cache.length > 0 && !cache.some((m) => m.isDisposed())) {
      return cache
    }
    const scene = this.owner?.scene
    if (!scene) return []
    const attrs = this as any
    const name = attrs.target as string
    const root: BABYLON.TransformNode | null = name
      ? scene.getMeshByName(name) ?? scene.getTransformNodeByName(name)
      : (semanticParent(this) as any)?.mesh ?? null
    if (!root) return []
    const self = root instanceof BABYLON.AbstractMesh ? [root] : []
    this._cache =
      attrs.include === 'self' ? self : [...self, ...root.getChildMeshes(false)]
    return this._cache
  }
}

export const b3dInteractive = B3dInteractive.elementCreator({
  tag: 'tosi-b3d-interactive',
})
