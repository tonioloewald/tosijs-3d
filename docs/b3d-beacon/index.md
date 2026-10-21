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
    panelTitle: 'Beacons',
    scenePanel: () => [
      toggle3d({
        label: 'show hulls',
        value: false,
        handleChange: (v) => {
          for (const b of sceneEl.querySelectorAll('tosi-b3d-beacon')) b.show = v ? 'on' : 'off'
        },
      }),
    ],
    sceneCreated(el) {
      orbitCam(el, { alphaDeg: -68.8, betaDeg: 48.7, radius: 20, target: [0, 0.5, 0] })
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

Passing your own pick predicate works around it, because Babylon consults a
predicate *instead of* that test rather than as well as it. But then the hull
silently stops working for any caller who picks without one.

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

A drawn marker would be clutter: a solid the author cannot move, delete or edit,
sitting in a view whose whole purpose is judging an arrangement. Collision
geometry is not seen. `show` exists for when you are debugging the hull itself.

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
correctly, because the thing it stands for is far away. [b3d-manipulator](/b3d-manipulator/) is
the other half of this: a beacon is what you click, handles are what you then
drag.
