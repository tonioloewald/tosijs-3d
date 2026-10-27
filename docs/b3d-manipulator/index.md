# b3d-manipulator

**Translate, rotate and scale handles you can grab — with a mouse, a finger, or
a hand in a headset.** Drop it in a scene, point it at an element or a mesh,
and it writes the result back.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dGround, b3dBox, b3dManipulator, toggle3d, select3d, label3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'

const { div } = elements
const readout = div({ class: 'readout' }, '0, 0.5, 0')

const gizmo = b3dManipulator({
  target: '#thing',
  turn: 'on',
  gridSnap: 0.25,
  angleSnap: 15,
  whenChange: (t) => {
    const n = (v) => Math.round(v * 100) / 100
    readout.textContent =
      `${n(t.position.x)}, ${n(t.position.y)}, ${n(t.position.z)}` +
      `   ·   ${Math.round(t.rotation.ry)}°   ·   ×${n(t.scale.x)}`
  },
})

// The controls live in the SCENE PANEL, so the same demo is usable in a headset.
const panel = () => [
  label3d({ text: 'Manipulator' }),
  toggle3d({
    label: 'move',
    value: gizmo.move !== 'off',
    handleChange: (v) => { gizmo.move = v ? 'on' : 'off' },
  }),
  toggle3d({
    label: 'turn',
    value: gizmo.turn !== 'off',
    handleChange: (v) => { gizmo.turn = v ? 'on' : 'off' },
  }),
  toggle3d({
    label: 'scale',
    value: gizmo.scale !== 'off',
    // Scale is exclusive of the other two — the element enforces that itself,
    // so the toggles simply follow it.
    handleChange: (v) => { gizmo.scale = v ? 'on' : 'off' },
  }),
  select3d({
    label: 'grid',
    value: 0.25,
    options: [{ label: 'off', value: 0 }, 0.25, 0.5, 1],
    handleChange: (v) => { gizmo.gridSnap = Number(v) },
  }),
  select3d({
    label: 'angle',
    value: 15,
    options: [{ label: 'off', value: 0 }, 5, 15, 45, 90],
    handleChange: (v) => { gizmo.angleSnap = Number(v) },
  }),
]

preview.append(
  b3d(
    {
      scenePanel: panel,
      sceneCreated(el) {
        orbitCam(el, { alpha: -1.1, beta: 1.05, radius: 8, target: [0, 0.5, 0] })
      },
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: 10 }),
    b3dLight({ intensity: 0.5 }),
    b3dGround({ size: 40, color: '#5d6b4a' }),
    b3dBox({ id: 'thing', y: 0.5, color: '#c8963c' }),
    gizmo
  ),
  readout
)
```
```css
.preview { display: flex; flex-direction: column; height: 100%; }
tosi-b3d { flex: 1; min-height: 0; width: 100%; }
.readout {
  padding: 4px 10px;
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  color: #fff;
  background: #0009;
}
```

Drag the arrows to move, the rings to turn, the cubes to scale. The pads move in
a plane. Everything is on at once — the part you grab says what the drag means.

## Attributes

| attribute | default | |
| --- | --- | --- |
| `target` | `''` | CSS selector for the element to manipulate. Or set `.node` in JS |
| `meshName` | `''` | a mesh in the scene, by name — for things that are not elements |
| `move` | `'on'` | `'on'`/`'off'` — arrows and plane pads |
| `turn` | `'off'` | `'on'`/`'off'` — rings |
| `scale` | `'off'` | `'on'`/`'off'` — cubes, plus the uniform centre cube |
| `gridSnap` | `0` | position snap in metres. `0` is off |
| `angleSnap` | `0` | angle snap in degrees. `0` is off |
| `size` | `0.13` | apparent size — the widget is this fraction of its distance from the camera, so it stays constant on screen |
| `disabled` | `false` | hide the handles and ignore input |

`whenChange(transform)` fires live during a drag; `whenCommit(transform)`
fires once on release, snapped, and only when something actually changed — which
is your undo step. Both also dispatch a DOM `change` / `commit` event carrying
the transform in `detail`. A component's callbacks are `when*`, not `handle*`.

## A grip, not a mode

Every enabled affordance is on screen at once, and the grip you grab says what
the drag means. A mode switch makes you say what you want twice, once to a
toolbar and again to the handle, and costs a round trip for the commonest edit
there is: nudge it over, then turn it a bit. The cost is crowding, and the
answer to that is the transform set: turn off what you are not using and its
grips are not built.

Each grip answers one question: *given where the pointer is aiming now, what
value should this handle have?*

| grip | reading |
| --- | --- |
| `translate` | the point on the axis closest to the pointer's ray |
| `planar` | where the ray crosses the plane the grip lies in, as a point |
| `rotate` | the angle around the axis where the ray crosses its plane |
| `scale` | the same projection as translate, read as a ratio |
| `uniform` | the ray's distance from the widget centre, read as a ratio |

## Scale is exclusive of move and turn

`node.scaling` is local, so scale grips ride the object's own axes while move
rides the world's. A widget showing both draws two frames at once and can only
mislead. Turning `scale` on therefore turns `move` and `turn` off, and vice versa —
the element does this to itself rather than letting you build the misleading
combination.

## Snapping and the frozen frame

Snapping quantises the resulting VALUE, not each step of the movement, so a
snapped object is always exactly on the grid however long the drag. Rotation is
the exception: it snaps its DELTA, because a 15° step about the ring you grabbed
is what the setting promises, even from a start rotation that is not on the grid.

A drag measures against the object's axes as they were when it began. Reading
them live is a feedback loop for rotation: each sample would be measured in a
frame your own output just turned, and a tiny movement would spin the object
hundreds of degrees.

## Where the transform is written, and why it is a fork

Getting this wrong does not error. It silently does nothing, which is the worst
failure mode a manipulator can have.

| target | written to | why |
| --- | --- | --- |
| an ELEMENT (`b3d-prop`, `b3d-destroyable`, any `AbstractMesh`) | `el.x/y/z`, `el.rx/ry/rz` | the element OWNS its transform — `render()` writes `mesh.position` and `rotationQuaternion` from those attributes every render, so a write straight to the mesh is undone the next time anything re-renders |
| a bare NODE | `node.position`, `node.rotationQuaternion`, `node.scaling` | nothing manages it, so the node IS the truth |

**Scale goes to the node in both branches.** `AbstractMesh.render()` does not
sync scaling, and no element attribute covers per-axis scale, so the node is
where a scale survives.

**Rotating a node clears its quaternion first.** A `TransformNode` ignores
`.rotation` while it has a `rotationQuaternion`, and the glTF loader always
sets one. Writing `.rotation` alone would leave every loaded model at its baked
orientation while `position` worked, which looks wired up and is not.

## Sized for hands, picked in two passes

Every drawn handle carries a second, invisible, fatter mesh that exists only to
be picked, because a gizmo that is visually thin is impossible to grab with a
controller at arm's length or a finger on a phone. A hand inside a handle's
`nearRadius` grabs it directly; anything further grabs by pointing.

Picking tries the DRAWN handles first, then the fat targets. The fat targets
overlap by design, so a single pass over both would let ray depth decide, and a
ring's tube passing in front of the arrowhead under the cursor would win.

Handles draw on top (rendering group 1), because the object you most want to
move is often embedded in something else. Rendering group has no bearing on
picking; it is safe here only because the handle pick admits nothing but handle
meshes, so an occluder is never a candidate.

## Driving it from XR, or from anything else

The flat pointer is wired for you. Everything else goes through three methods
that take world rays, so a controller, a hand or a script drives the same code:

```javascript
const grabbed = el.grab({ origin, direction }, { secondary: false })
el.drag({ origin, direction })
el.release()
```

`grabNear({x, y, z})` is the near-interaction form: a hand inside a handle grabs
it directly, which beats whatever the same controller's ray happens to be
crossing further away.

The pure maths (`beginDrag`, `updateDrag`, `commitTransform`, `snap`, …) and the
handle geometry (`createHandles`, `composeRotation`, `axisFrameOf`) are exported
too, for a consumer building its own widget.
