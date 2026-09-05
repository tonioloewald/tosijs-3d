/*#
# b3d-beacon

**A clickable hull for anything that has a position and no geometry.** A lamp is
a light; a positional sound is a sound; a spawn point is a coordinate. All three
can be placed, moved and listed — and none of them has anything for a ray to
land on, so none of them can be clicked.

## Demo

Three lamps with `geometry: 'off'` — so there is genuinely nothing in the scene
but the light they cast. Click where one is and the readout names it. The hulls
are invisible; the toggle shows you what you are actually hitting.

```js
import { b3d, b3dLight, b3dSkybox, b3dGround, b3dPointLight, b3dBeacon, beaconOwner, toggle3d, label3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'

const { div } = elements
const readout = div({ class: 'readout' }, 'click a lamp')

const lamp = (name, x, z, colour) =>
  b3dPointLight({ x, y: 1.6, z, diffuse: colour, intensity: 8, range: 6, geometry: 'off' },
    b3dBeacon({ name }))

const sceneEl = b3d(
  {
    style: 'width:100%;height:100%',
    scenePanelOpen: true,
    scenePanel: () => [
      label3d({ text: 'Beacons' }),
      toggle3d({
        label: 'show hulls',
        value: false,
        handleChange: (v) => {
          for (const b of sceneEl.querySelectorAll('tosi-b3d-beacon')) b.show = v ? 'on' : 'off'
        },
      }),
    ],
    sceneCreated(el) {
      orbitCam(el, { alpha: -1.2, beta: 0.85, radius: 20, target: [0, 0.5, 0] })
      // Ordinary picking — no predicate. That is the whole point; see below.
      el.scene.onPointerDown = () => {
        const hit = el.scene.pick(el.scene.pointerX, el.scene.pointerY)
        const owner = beaconOwner(hit?.pickedMesh)
        readout.textContent = owner ? `picked: ${owner.name}` : 'nothing there'
      }
    },
  },
  // No sun: Babylon lights a material with at most four lights by default, and
  // a sun plus ambient plus three lamps is five — the third lamp silently goes
  // dark, which reads as a broken beacon rather than a lighting budget.
  b3dSkybox({ timeOfDay: 21 }),
  b3dLight({ intensity: 0.12 }),
  b3dGround({ size: 60, color: '#3b4152' }),
  lamp('red lamp', -6, 0, '#ff5544'),
  lamp('green lamp', 0, -5, '#44ff88'),
  lamp('blue lamp', 6, 2, '#5588ff')
)

preview.append(readout, sceneEl)
```
```css
.preview { height: 100%; position: relative; }
.readout {
  position: absolute;
  z-index: 1;
  left: 8px;
  bottom: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: #fff;
  background: #0009;
}
```

## Attributes

| attribute | default | |
| --- | --- | --- |
| `name` | `''` | what this beacon stands for, for a readout or a list |
| `size` | `0.5` | cube edge, in metres |
| `width` `height` `depth` | `0` | per-axis extent; `0` means "use `size`" |
| `shape` | `'box'` | `'box'` or `'sphere'` |
| `show` | `'off'` | `'on'` draws it as a wireframe — for debugging, not for play |
| `follow` | `'on'` | track the element this is nested in, rather than its own `x`/`y`/`z` |
| `x` `y` `z` | `0` | position, used when `follow` is off or there is nothing to follow |

## Invisible, and pickable anyway — the part that is easy to get wrong

⚠️ **Babylon's default pick test is `isEnabled() && isVisible && isPickable`,**
so hiding a hull the obvious way — `isVisible = false` — makes it **unpickable**,
which is the only thing it exists for.

`tosijs-3d-ensemble` hit this and worked around it by always passing its own pick
predicate, because Babylon consults a predicate *instead of* that test rather
than as well as it. That works, and it makes the hull silently stop working for
any caller who picks without one, so "picking is broken" is rediscovered by
every consumer in turn.

**This uses `visibility = 0` instead**, which draws nothing while leaving
`isVisible` true — so an ordinary `scene.pick(x, y)` with no predicate finds it,
and there is no contract to remember. The demo above picks that way on purpose.

Measured against a live scene rather than reasoned about, since "it should still
be pickable" is the kind of claim that is wrong quietly:

| hull | `scene.pick(x, y)` returns |
| --- | --- |
| `visibility = 0` | **the hull** |
| `isVisible = false` | whatever is BEHIND it |
| `isVisible = false`, with a predicate | the hull |

The middle row is the failure, and note what it does: it does not throw or
return nothing, it returns *a different object*. A consumer sees the wrong thing
selected, which is a much harder bug to attribute than a dead click.

## Invisible, not drawn

The first version of this elsewhere drew an amber cube. It works, and it is
clutter: a solid the author cannot move, delete or edit, sitting in a view whose
whole purpose is judging an arrangement. Collision geometry is not seen. `show`
exists for when you are debugging the hull itself.

## Opt-in, never blanket

A beacon is not given to everything without geometry. Most environment
primitives have no location to mark: a skybox is everywhere, `fog` and `ambient`
are settings, and a sun's direction is a DIRECTION — a dot floating at
`(-0.5, 1, 0.4)` would be a confident lie about where the sun is. Three junk
markers near the origin is what the blanket rule produces.

So you nest one where you want one, and nowhere else.

## A light's extent is NOT its range

Tempting, and wrong. A 40 m point light would give a 40 m hull that swallows
every other pick in the room — including the lamps inside it, so the feature
would defeat itself at exactly the density where you need it.

A beacon marks a POINT, so its default is a nominal half-metre cube: big enough
to hit on a phone, small enough not to read as scenery. Set `size` when the
thing genuinely has an extent — a trigger volume, a zone, a tile.

## It does not scale with the camera

A handle does; a marker does not. **A handle is a control, a marker is a fact
about the world** — so a beacon two hundred metres away is a small target,
correctly, because the thing it stands for is far away. [[b3d-manipulator]] is
the other half of this: a beacon is what you click, handles are what you then
drag.
*/
/*{ "parent": "Utilities", "order": 121 }*/

import * as BABYLON from '@babylonjs/core'
import { AbstractMesh, isOff, semanticParent } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'

/** Marks a mesh as a beacon hull, and remembers whose it is. */
const BEACON_TAG = 'tosi-b3d-beacon'

/**
 * The beacon element a picked mesh belongs to, or null.
 *
 * The whole API on the reading side: pick however you like, ask this, and you
 * have the thing the author was pointing at.
 */
export function beaconOwner(mesh: unknown): B3dBeacon | null {
  const meta = (mesh as { metadata?: Record<string, unknown> } | null)?.metadata
  const owner = meta?.[BEACON_TAG]
  return owner instanceof B3dBeacon ? owner : null
}

export class B3dBeacon extends AbstractMesh {
  static preferredTagName = 'tosi-b3d-beacon'

  static initAttributes = {
    ...AbstractMesh.initAttributes,
    name: '',
    size: 0.5,
    width: 0,
    height: 0,
    depth: 0,
    shape: 'box',
    // 'on'/'off' rather than booleans — a boolean attribute cannot default to
    // true, and `follow` should.
    show: 'off',
    follow: 'on',
  }

  declare name: string
  declare size: number
  declare width: number
  declare height: number
  declare depth: number
  declare shape: string
  declare show: string
  declare follow: string

  /** What this beacon stands for — the nested-in element, when there is one. */
  host: HTMLElement | null = null

  private _observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _built = ''

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    this.host = isOff(this.follow) ? null : this._findHost()
    this._build(scene)
    if (this.host != null) {
      // Track the host every frame rather than once: a lamp can be moved by a
      // manipulator, an animation or an attribute write, and a hull that stops
      // agreeing with the thing it stands for is worse than no hull.
      this._observer = scene.onBeforeRenderObservable.add(() => this._track())
    }
    owner.register({ meshes: this.mesh != null ? [this.mesh] : [] })
  }

  sceneDispose(): void {
    const scene = this.owner?.scene
    if (scene != null) scene.onBeforeRenderObservable.remove(this._observer)
    this._observer = null
    this.mesh?.dispose()
    this.mesh = undefined
    super.sceneDispose()
  }

  render(): void {
    super.render()
    const scene = this.owner?.scene
    // Rebuild only when the SHAPE changed. `render` runs on any attribute
    // write, and disposing the hull under a pointer that is picking it is a
    // needless way to drop a click.
    if (scene != null && this._key() !== this._built) this._build(scene)
    this._applyVisibility()
  }

  /** What the object this stands for is, if it is nested in one. */
  private _findHost(): HTMLElement | null {
    // `semanticParent`, not `parentElement`: tosijs mounts light-DOM children
    // inside a `<tosi-slot>`, so the parent of a nested beacon is that slot.
    const parent = semanticParent(this)
    return parent instanceof HTMLElement ? parent : null
  }

  private _key(): string {
    return [this.shape, this.size, this.width, this.height, this.depth].join('/')
  }

  private _build(scene: BABYLON.Scene): void {
    this.mesh?.dispose()
    const s = Number(this.size) > 0 ? Number(this.size) : 0.5
    const w = Number(this.width) > 0 ? Number(this.width) : s
    const h = Number(this.height) > 0 ? Number(this.height) : s
    const d = Number(this.depth) > 0 ? Number(this.depth) : s
    /*
    A CUBE, not a sphere: it is a stand-in for a thing rather than a thing.
    A sphere is also the shape a beacon is most likely to be mistaken for
    something the scene actually contains.
    */
    this.mesh =
      this.shape === 'sphere'
        ? BABYLON.MeshBuilder.CreateSphere(
            'beacon',
            { diameterX: w, diameterY: h, diameterZ: d },
            scene
          )
        : BABYLON.MeshBuilder.CreateBox(
            'beacon',
            { width: w, height: h, depth: d },
            scene
          )
    this.mesh.isPickable = true
    this.mesh.metadata = { [BEACON_TAG]: this }
    /*
    A hull must never affect the picture: no shadow, no reflection, nothing in
    a probe's render list. It is geometry that exists to be hit.
    */
    this.mesh.receiveShadows = false
    this.mesh.doNotSyncBoundingInfo = false
    this._built = this._key()
    this._applyVisibility()
    this._track()
  }

  private _applyVisibility(): void {
    const mesh = this.mesh
    if (mesh == null) return
    const shown = !isOff(this.show)
    mesh.enableEdgesRendering()
    mesh.edgesWidth = shown ? 2 : 0
    /*
    `visibility = 0`, NOT `isVisible = false` — the whole reason this works
    without a pick predicate. See the doc comment above; getting this wrong
    makes the hull unpickable, which is the only thing it is for.
    */
    mesh.visibility = shown ? 0.15 : 0
    mesh.isVisible = true
  }

  /** Sit where the thing we stand for sits. */
  private _track(): void {
    const mesh = this.mesh
    if (mesh == null) return
    const at = this._hostPosition()
    if (at == null) return
    mesh.position.copyFrom(at)
  }

  /**
   * Where the host is — a node, a light, or a mesh, whichever it has.
   *
   * Returns null when there is nothing to follow, and then `AbstractMesh`'s own
   * `x`/`y`/`z` sync is left to place the hull. That is the standalone case: a
   * spawn point or a reference marker that stands for a coordinate rather than
   * for another element.
   */
  private _hostPosition(): BABYLON.Vector3 | null {
    const host = this.host as
      | {
          node?: BABYLON.TransformNode
          mesh?: BABYLON.TransformNode
          light?: BABYLON.Light & { position?: BABYLON.Vector3 }
        }
      | null
      | undefined
    if (host == null) return null
    if (host.node?.getAbsolutePosition != null)
      return host.node.getAbsolutePosition()
    if (host.mesh?.getAbsolutePosition != null)
      return host.mesh.getAbsolutePosition()
    // A directional light has no position, only a direction — following one
    // would put a marker at the origin and claim the sun lives there.
    if (host.light?.position != null) return host.light.position
    return null
  }
}

export const b3dBeacon = B3dBeacon.elementCreator()
