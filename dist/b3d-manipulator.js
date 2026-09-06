/*#
# b3d-manipulator

**Translate, rotate and scale handles you can grab — with a mouse, a finger, or
a hand in a headset.** The maths is [[manipulator]], the geometry is
[[manipulator-view]], and this is the element that puts them in a scene and
writes the result somewhere.

## Demo

Drag the arrows to move, the rings to turn, the cubes to scale. The pads move in
a plane. Everything is on at once — the part you grab says what the drag means.

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
  handleChange: (t) => {
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
  readout,
  b3d(
    {
      style: 'width:100%;height:100%',
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
  )
)
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
| `target` | `''` | CSS selector for the element to manipulate. Or set `.node` in JS |
| `meshName` | `''` | a mesh in the scene, by name — for things that are not elements |
| `move` | `'on'` | `'on'`/`'off'` — arrows and plane pads |
| `turn` | `'off'` | `'on'`/`'off'` — rings |
| `scale` | `'off'` | `'on'`/`'off'` — cubes, plus the uniform centre cube |
| `gridSnap` | `0` | position snap in metres. `0` is off |
| `angleSnap` | `0` | angle snap in degrees. `0` is off |
| `size` | `0.13` | apparent size — the widget is this fraction of its distance from the camera, so it stays constant on screen |
| `disabled` | `false` | hide the handles and ignore input |

`handleChange(transform)` fires live during a drag; `handleCommit(transform)`
fires once on release, snapped, and only when something actually changed — which
is your undo step. Both also dispatch a DOM `change` / `commit` event carrying
the transform in `detail`.

## Scale is exclusive of move and turn

`node.scaling` is local, so scale grips ride the object's own axes while move
rides the world's. A widget showing both draws two frames at once and can only
mislead. Turning `scale` on therefore turns `move` and `turn` off, and vice versa —
the element does this to itself rather than letting you build the misleading
combination.

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
`.rotation` while it has a `rotationQuaternion` — and the glTF loader always
sets one. That is exactly the bug that made `library.instantiate()`'s rotation
silently inert until 0.7.0: it wrote `.rotation`, the quaternion won, and every
value produced the model's baked orientation. `position` worked, which is what
made it look wired up.

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

## Where this came from

Ported from `tosijs-3d-ensemble`, which built and shook it out against real
authoring — including on a phone, which is where most of the sizing decisions
were won. This library had no manipulator at all (#38), and `b3d-panel`'s
coloured debug axes look exactly like one, which is its own small cruelty.
*/
/*{ "parent": "UI", "order": 275 }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild, cameraIsAttached, isOff } from './b3d-utils.js';
import { beginDrag, commitTransform, dragChanged, updateDrag, } from './manipulator.js';
import { axisFrameOf, composeRotation, createHandles, } from './manipulator-view.js';
const DEG_TO_RAD = Math.PI / 180;
export class B3dManipulator extends B3dChild {
    static preferredTagName = 'tosi-b3d-manipulator';
    static initAttributes = {
        target: '',
        meshName: '',
        /*
        `move`/`turn`, NOT `translate`/`rotate`.
    
        `translate` is a real HTMLElement property — the global HTML attribute that
        tells the browser's translation machinery whether to translate an element's
        text. Declaring an attribute by that name gives one word two owners, and
        the compiler catches it only because the base type disagrees. `move` and
        `turn` are also the words an author would use.
    
        'on'/'off' rather than booleans, because a boolean attribute cannot default
        to true and `move` genuinely should.
        */
        move: 'on',
        turn: 'off',
        scale: 'off',
        gridSnap: 0,
        angleSnap: 0,
        size: 0.13,
        disabled: false,
    };
    /** Live during a drag; fires again for every frame the pointer moves. */
    handleChange = null;
    /** Once on release, snapped, and only when something changed. */
    handleCommit = null;
    /** The node being manipulated. Set this directly to skip `target`. */
    node = null;
    _view = null;
    _drag = null;
    _pointer = null;
    _frame = null;
    _cameraWasAttached = false;
    sceneReady(owner, scene) {
        this._view = createHandles(scene);
        this._view.setTransforms(this._transformSet());
        this._frame = scene.onBeforeRenderObservable.add(() => this._track());
        this._pointer = scene.onPointerObservable.add((info) => {
            this._onPointer(info, scene);
        });
        void owner;
    }
    sceneDispose() {
        const scene = this.owner?.scene;
        if (scene != null) {
            scene.onBeforeRenderObservable.remove(this._frame);
            scene.onPointerObservable.remove(this._pointer);
        }
        this._frame = null;
        this._pointer = null;
        this._releaseCamera();
        this._view?.dispose();
        this._view = null;
        this._drag = null;
        super.sceneDispose();
    }
    render() {
        super.render();
        this._view?.setTransforms(this._transformSet());
    }
    /*
    SCALE IS EXCLUSIVE OF MOVE AND TURN.
  
    Not a preference — `node.scaling` is local, so scale grips ride the object's
    axes while move rides the world's, and a widget drawing both frames at once
    can only mislead. Resolved here rather than trusted from the attributes, so
    the misleading combination is not expressible.
    */
    _transformSet() {
        const scale = !isOff(this.scale);
        return {
            translate: !scale && !isOff(this.move),
            rotate: !scale && !isOff(this.turn),
            scale,
        };
    }
    /** The element whose transform we write, if the target is one. */
    _targetElement() {
        const selector = String(this.target ?? '');
        if (selector === '' || this.owner == null)
            return null;
        const found = this.owner.querySelector(selector) ??
            this.getRootNode().querySelector?.(selector) ??
            null;
        return found ?? null;
    }
    /** The node we move, from whichever route was used to name it. */
    _targetNode() {
        if (this.node != null)
            return this.node;
        const el = this._targetElement();
        if (el?.mesh != null)
            return el.mesh;
        const name = String(this.meshName ?? '');
        if (name !== '' && this.owner != null) {
            return this.owner.scene.getNodeByName(name);
        }
        return null;
    }
    /** Where the widget sits and how big it draws, once per frame. */
    _track() {
        const view = this._view;
        const scene = this.owner?.scene;
        if (view == null || scene == null)
            return;
        const node = this._targetNode();
        const on = node != null && this.disabled !== true;
        view.setVisible(on);
        if (!on)
            return;
        const p = node.getAbsolutePosition();
        view.moveTo({ x: p.x, y: p.y, z: p.z });
        view.setOrientation(this._rotationOf(node));
        const camera = scene.activeCamera;
        if (camera != null) {
            // Constant size ON SCREEN: world-sized handles are correct at exactly one
            // camera distance and unusable at every other.
            const d = BABYLON.Vector3.Distance(camera.globalPosition, p);
            view.setScale(Math.max(0.05, d * (Number(this.size) || 0.13)));
        }
    }
    _rotationOf(node) {
        const el = this._targetElement();
        if (el != null && typeof el.ry === 'number') {
            return { rx: el.rx ?? 0, ry: el.ry ?? 0, rz: el.rz ?? 0 };
        }
        const e = node.rotationQuaternion != null
            ? node.rotationQuaternion.toEulerAngles()
            : node.rotation;
        return { rx: e.x / DEG_TO_RAD, ry: e.y / DEG_TO_RAD, rz: e.z / DEG_TO_RAD };
    }
    /** The transform as it stands now, in the units the drag speaks. */
    _currentTransform(node) {
        const p = node.getAbsolutePosition();
        return {
            position: { x: p.x, y: p.y, z: p.z },
            rotation: this._rotationOf(node),
            scale: {
                x: node.scaling.x,
                y: node.scaling.y,
                z: node.scaling.z,
            },
        };
    }
    /* --------------------------------------------------------------------- *
     * Grabbing — a ray API, so XR and the flat pointer are the same code
     * --------------------------------------------------------------------- */
    /** Start a drag from a world ray. Returns whether a handle was grabbed. */
    grab(ray, options = {}) {
        const view = this._view;
        const node = this._targetNode();
        if (view == null || node == null || this.disabled === true)
            return false;
        const grip = view.gripAt(ray);
        return grip != null ? this._begin(grip, node, ray, options) : false;
    }
    /**
     * Start a drag from a HAND inside a handle.
     *
     * Near beats far: a hand inside a handle is unambiguous, and beats whatever
     * the same controller's ray happens to be crossing further away.
     */
    grabNear(hand, ray, options = {}) {
        const view = this._view;
        const node = this._targetNode();
        if (view == null || node == null || this.disabled === true)
            return false;
        const grip = view.nearestGrip(hand);
        return grip != null ? this._begin(grip, node, ray, options) : false;
    }
    _begin(grip, node, ray, options) {
        const transform = this._currentTransform(node);
        const drag = beginDrag(grip, transform.position, transform, ray, axisFrameOf(transform.rotation), { secondary: options.secondary === true });
        if (drag == null)
            return false;
        this._drag = drag;
        // The camera must stop listening the moment a handle is grabbed, or the
        // drag moves the object AND orbits the view under it.
        this._captureCamera();
        return true;
    }
    /** Continue a drag. Harmless when nothing is grabbed. */
    drag(ray) {
        const d = this._drag;
        if (d == null)
            return;
        const options = {
            gridSnap: Number(this.gridSnap) || 0,
            angleSnap: Number(this.angleSnap) || 0,
        };
        if (!updateDrag(d, ray, composeRotation, options))
            return;
        this._write(d.current);
        this.handleChange?.(d.current);
        this.dispatchEvent(new CustomEvent('change', { detail: d.current, bubbles: true }));
    }
    /**
     * Finish a drag, committing the snapped transform.
     *
     * Returns whether the gesture was a DRAG at all. A press that grabbed a
     * handle and never moved is a CLICK, and the caller may want to treat it as
     * one: with everything switched on the widget covers a good deal of what is
     * behind it, so once something is selected, tapping beside it usually lands
     * on a handle instead.
     */
    release() {
        const d = this._drag;
        this._drag = null;
        // Always give the camera back, even on a drag that grabbed nothing —
        // otherwise a mis-click leaves the view frozen with no way to recover.
        this._releaseCamera();
        if (d == null)
            return false;
        const options = {
            gridSnap: Number(this.gridSnap) || 0,
            angleSnap: Number(this.angleSnap) || 0,
        };
        const committed = commitTransform(d, options);
        if (!dragChanged(d, committed))
            return d.moved;
        this._write(committed);
        this.handleCommit?.(committed);
        this.dispatchEvent(new CustomEvent('commit', { detail: committed, bubbles: true }));
        return true;
    }
    /** Is a drag in progress? */
    get dragging() {
        return this._drag != null;
    }
    /* --------------------------------------------------------------------- *
     * Writing
     * --------------------------------------------------------------------- */
    _write(t) {
        const node = this._targetNode();
        if (node == null)
            return;
        const el = this._targetElement();
        if (el != null && typeof el.x === 'number') {
            // The element owns position and rotation: writing the mesh instead is
            // undone by its next render, silently.
            el.x = t.position.x;
            el.y = t.position.y;
            el.z = t.position.z;
            el.rx = t.rotation.rx;
            el.ry = t.rotation.ry;
            el.rz = t.rotation.rz;
        }
        else {
            node.position.set(t.position.x, t.position.y, t.position.z);
            // Clear the quaternion or `.rotation` is ignored — the glTF loader always
            // sets one, and a rotation drag would move nothing with no error.
            node.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(t.rotation.ry * DEG_TO_RAD, t.rotation.rx * DEG_TO_RAD, t.rotation.rz * DEG_TO_RAD);
        }
        // Scale goes to the NODE either way: `AbstractMesh.render()` does not sync
        // scaling, and no element attribute covers per-axis scale.
        node.scaling.set(t.scale.x, t.scale.y, t.scale.z);
    }
    /* --------------------------------------------------------------------- *
     * The flat pointer
     * --------------------------------------------------------------------- */
    _onPointer(info, scene) {
        if (this.disabled === true)
            return;
        const camera = scene.activeCamera;
        if (camera == null)
            return;
        const e = info.event;
        const pick = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);
        const ray = {
            origin: { x: pick.origin.x, y: pick.origin.y, z: pick.origin.z },
            direction: {
                x: pick.direction.x,
                y: pick.direction.y,
                z: pick.direction.z,
            },
        };
        if (info.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            // `button === 2` is the secondary: on a scale grip it inverts which axes
            // move. Latched at the grab — see `DragOptions.secondary`.
            this.grab(ray, { secondary: e.button === 2 });
            return;
        }
        if (info.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            this.drag(ray);
            return;
        }
        if (info.type === BABYLON.PointerEventTypes.POINTERUP ||
            info.type === BABYLON.PointerEventTypes.POINTERDOUBLETAP) {
            this.release();
        }
    }
    _captureCamera() {
        const camera = this.owner?.scene.activeCamera;
        if (camera == null)
            return;
        this._cameraWasAttached = cameraIsAttached(camera);
        if (this._cameraWasAttached)
            camera.detachControl();
    }
    _releaseCamera() {
        if (!this._cameraWasAttached)
            return;
        this._cameraWasAttached = false;
        const camera = this.owner?.scene.activeCamera;
        const canvas = this.owner?.scene.getEngine().getRenderingCanvas();
        if (camera != null && canvas != null)
            camera.attachControl(canvas, true);
    }
}
export const b3dManipulator = B3dManipulator.elementCreator();
//# sourceMappingURL=b3d-manipulator.js.map