/*#
# b3d-trigger

Invisible proximity zone that fires callbacks and dispatches events when
a target (the active camera or a named mesh) enters or exits a spherical
region. Useful for mission waypoints, area-of-effect zones, and cutscene
triggers.

Set `onEnter` and `onExit` callback properties from JavaScript, or listen
for `'enter'` / `'exit'` CustomEvents on the element.

## Demo

```js
import { b3d, b3dTrigger, b3dSphere, b3dLight, b3dSkybox, b3dBiped, b3dGround, gameController, inputFocus } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, span, p } = elements

const { demo } = tosi({ demo: { status: 'outside' } })

const trigger = b3dTrigger({
  x: 0, y: 0, z: 5,
  radius: 3,
  debug: true,
})
trigger.onEnter = () => { demo.status.value = 'INSIDE zone!' }
trigger.onExit = () => { demo.status.value = 'outside' }

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2, Math.PI / 3, 15,
          BABYLON.Vector3.Zero(), el.scene
        )
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      }
    },
    b3dLight({ y: 1, intensity: 0.8 }),
    b3dSkybox({ timeOfDay: 12 }),
    b3dGround({ diameter: 20, color: '#556644' }),
    inputFocus(
      gameController(),
      b3dBiped({ url: './omnidude.glb', player: true, cameraType: 'follow' }),
    ),
    trigger,
  ),
  div(
    { style: 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:8px 12px; border-radius:6px; font:14px monospace' },
    p('Walk into the green sphere'),
    span({ bindText: demo.status }),
  )
)
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `x` | `0` | Center X |
| `y` | `0` | Center Y |
| `z` | `0` | Center Z |
| `radius` | `5` | Trigger sphere radius |
| `active` | `true` | Enable/disable the trigger |
| `target` | `'camera'` | `'camera'` or a mesh name to watch |
| `debug` | `false` | Show wireframe sphere |
| `once` | `false` | Fire onEnter once then deactivate |
*/
import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
export class B3dTrigger extends Component {
    static styleSpec = {
        ':host': {
            display: 'none',
        },
    };
    static initAttributes = {
        x: 0,
        y: 0,
        z: 0,
        radius: 5,
        active: true,
        target: 'camera',
        debug: false,
        once: false,
    };
    owner = null;
    onEnter = null;
    onExit = null;
    _inside = false;
    _beforeRender = null;
    debugMesh = null;
    content = () => '';
    connectedCallback() {
        super.connectedCallback();
    }
    sceneReady(owner, _scene) {
        this.owner = owner;
        this._beforeRender = () => this.checkProximity();
        this.owner.scene.registerBeforeRender(this._beforeRender);
        this.updateDebugMesh();
    }
    sceneDispose() {
        if (this.owner && this._beforeRender) {
            this.owner.scene.unregisterBeforeRender(this._beforeRender);
            this._beforeRender = null;
        }
        this.disposeDebugMesh();
        this.owner = null;
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
    render() {
        super.render();
        if (!this.owner)
            return;
        this.updateDebugMesh();
    }
    /** Whether the target is currently inside the trigger */
    get inside() {
        return this._inside;
    }
    checkProximity() {
        if (this.owner == null)
            return;
        const attrs = this;
        if (!attrs.active)
            return;
        const targetPos = this.resolveTargetPosition();
        if (!targetPos)
            return;
        const triggerPos = new BABYLON.Vector3(attrs.x, attrs.y, attrs.z);
        const dist = BABYLON.Vector3.Distance(targetPos, triggerPos);
        if (dist < attrs.radius && !this._inside) {
            this._inside = true;
            this.onEnter?.(this);
            this.dispatchEvent(new CustomEvent('enter', { detail: { trigger: this }, bubbles: true }));
            if (attrs.once) {
                ;
                this.active = false;
            }
        }
        else if (dist >= attrs.radius && this._inside) {
            this._inside = false;
            this.onExit?.(this);
            this.dispatchEvent(new CustomEvent('exit', { detail: { trigger: this }, bubbles: true }));
        }
    }
    resolveTargetPosition() {
        if (this.owner == null)
            return null;
        const attrs = this;
        if (attrs.target === 'camera') {
            const cam = this.owner.scene.activeCamera;
            return cam ? cam.globalPosition : null;
        }
        const mesh = this.owner.scene.getMeshByName(attrs.target);
        return mesh ? mesh.absolutePosition : null;
    }
    updateDebugMesh() {
        if (this.owner == null)
            return;
        const attrs = this;
        if (attrs.debug && !this.debugMesh) {
            this.debugMesh = BABYLON.MeshBuilder.CreateSphere('trigger-debug', { diameter: 2, segments: 16 }, this.owner.scene);
            const mat = new BABYLON.StandardMaterial('trigger-debug-mat', this.owner.scene);
            mat.wireframe = true;
            mat.emissiveColor = new BABYLON.Color3(0, 1, 0);
            mat.disableLighting = true;
            this.debugMesh.material = mat;
            this.debugMesh.isPickable = false;
        }
        if (this.debugMesh) {
            this.debugMesh.position.set(attrs.x, attrs.y, attrs.z);
            this.debugMesh.scaling.setAll(attrs.radius);
            this.debugMesh.setEnabled(attrs.debug);
        }
        if (!attrs.debug && this.debugMesh) {
            this.disposeDebugMesh();
        }
    }
    disposeDebugMesh() {
        if (this.debugMesh) {
            this.debugMesh.dispose();
            this.debugMesh = null;
        }
    }
}
export const b3dTrigger = B3dTrigger.elementCreator({
    tag: 'tosi-b3d-trigger',
});
//# sourceMappingURL=b3d-trigger.js.map