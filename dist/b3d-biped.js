/*#
# b3d-biped

Animated humanoid character controller. Loads a GLB model with skeletal animations
and drives it via `ControlInput`.

## Demo

```js
import { b3d, b3dBiped, b3dLight, b3dSkybox, b3dGround } from 'tosijs-3d'
import { elements, tosi } from 'tosijs'
const { div, label, select, option, input } = elements

const animations = [
  'idle', 'walk', 'run', 'sneak', 'climb', 'walkBackwards',
  'jump', 'running-jump', 'salute', 'wave',
  'tread-water', 'swim', 'talk', 'look', 'dance', 'pickup', 'pilot',
]

const { bipedDemo } = tosi({
  bipedDemo: {
    animation: 'idle',
    speed: 1,
  }
})

const biped = b3dBiped({
  url: './omnidude.glb',
  animation: bipedDemo.animation,
  animationSpeed: bipedDemo.speed,
})

preview.append(
  b3d(
    {
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera(
          'cam', -Math.PI / 2, Math.PI / 3.5, 2,
          new BABYLON.Vector3(0, 0.5, 0), el.scene
        )
        camera.lowerRadiusLimit = 1.5
        camera.upperRadiusLimit = 10
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    b3dLight({ y: 1, intensity: 0.7 }),
    b3dSkybox({ timeOfDay: 10 }),
    b3dGround({ width: 10, height: 10 }),
    biped,
  ),
  div(
    { class: 'controls' },
    label(
      'Animation ',
      select(
        { bindValue: bipedDemo.animation },
        ...animations.map(a => option({ value: a }, a)),
      ),
    ),
    label(
      'Speed ',
      input({ type: 'range', min: 0, max: 2, step: 0.1, bindValue: bipedDemo.speed }),
    ),
  ),
)
```
```css
tosi-b3d { width: 100%; height: 100%; }
.controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  z-index: 10;
}
.controls select {
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
}
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `url` | `''` | GLB model URL |
| `animation` | `''` | Current animation state name |
| `animationSpeed` | `1` | Playback speed multiplier (0–2) |
| `player` | `false` | Whether this biped receives input |
| `cameraType` | `'none'` | `'follow'`, `'xr'`, or `'none'` |
| `turnSpeed` | `180` | Degrees per second |
| `forwardSpeed` | `2` | Walk speed |
| `runSpeed` | `5` | Sprint speed |
| `backwardSpeed` | `1` | Backward speed |
| `cameraHeightOffset` | `1` | Camera height above target |
| `cameraTargetHeight` | `0.75` | Height of the point the camera looks at |
| `cameraMinFollowDistance` | `2` | Closest follow distance |
| `cameraMaxFollowDistance` | `5` | Furthest follow distance |

## Animations

The biped automatically transitions between animation states based on input:
`idle`, `walk`, `run`, `walkBackwards`, `sneak`, `jump`, `swim`, `dance`, `pilot`, etc.

Animation names in the GLB must match these names.

## Usage

```javascript
import { b3d, b3dBiped, gameController, inputFocus } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({
        url: './character.glb',
        player: true,
        cameraType: 'follow',
        initialState: 'idle',
      })
    )
  )
)
```
*/
import * as BABYLON from '@babylonjs/core';
import { xrControllers } from './gamepad';
import { B3dControllable } from './b3d-controllable';
import { CompositeInputProvider } from './control-input';
import { XRInputProvider } from './xr-input-provider';
const DEG_TO_RAD = Math.PI / 180;
function lerp(a, b, t) {
    return a + (b - a) * t;
}
export class AnimState {
    animation;
    name;
    loop;
    additive;
    backwards;
    constructor(spec) {
        this.animation = spec.animation;
        this.name = spec.name || spec.animation;
        this.loop = spec.loop ?? false;
        this.additive = spec.additive ?? false;
        this.backwards = spec.backwards ?? false;
    }
    static buildList(...specs) {
        return specs.map((spec) => new AnimState(spec));
    }
}
export class B3dBiped extends B3dControllable {
    static initAttributes = {
        ...B3dControllable.initAttributes,
        url: '',
        player: false,
        cameraType: 'none',
        animation: '',
        animationSpeed: 1,
        initialState: 'idle',
        turnSpeed: 180,
        forwardSpeed: 2,
        runSpeed: 5,
        backwardSpeed: 1,
        cameraHeightOffset: 1,
        cameraTargetHeight: 0.75,
        cameraMinFollowDistance: 2,
        cameraMaxFollowDistance: 5,
    };
    entries;
    camera;
    xrStuff;
    xrInputProvider;
    animationState;
    animationGroup;
    gameController;
    // XR camera: zoom goes from (1 back, 1 up) to (5 back, 2 up), default (2 back, 1.25 up)
    xrCamZoom = 0.25; // 0 = closest, 1 = furthest
    animationStates = AnimState.buildList({ animation: 'idle', loop: true }, { animation: 'walk', loop: true }, { animation: 'sneak', loop: true }, { animation: 'run', loop: true }, { animation: 'climb', loop: true }, { name: 'walkBackwards', animation: 'walk', backwards: true, loop: true }, { animation: 'jump', loop: false }, { animation: 'running-jump', loop: false }, { animation: 'salute', loop: false }, { animation: 'wave', loop: false, additive: true }, { animation: 'tread-water', loop: true }, { animation: 'swim', loop: true }, { animation: 'talk', loop: true }, { animation: 'look', loop: true }, { animation: 'dance', loop: true }, { animation: 'pickup', loop: false }, { animation: 'pilot', loop: true });
    setAnimationState(name, speed = 1) {
        if (name == null) {
            throw new Error('setAnimationState failed, no animation name specified.');
        }
        if (this.animationState?.name === name ||
            this.animationState?.animation === name) {
            this.animationGroup.speedRatio = speed;
            return;
        }
        if (this.entries == null)
            return;
        const newState = this.animationStates.find((state) => state.name === name || state.animation === name);
        if (newState == null) {
            console.error(`setAnimationState: no state named "${name}"`);
            return;
        }
        const idx = this.entries.animationGroups.findIndex((g) => g.name.endsWith(newState.animation));
        if (idx === -1) {
            console.error(`setAnimationState: could not find animation "${newState.animation}"`);
            return;
        }
        this.animationState = newState;
        const loop = newState.loop;
        const additive = newState.additive;
        if (loop) {
            for (const ag of this.entries.animationGroups) {
                ag.stop();
            }
        }
        const animationGroup = this.entries.animationGroups[idx];
        if (newState.backwards) {
            animationGroup.start(loop, speed, animationGroup.to, animationGroup.from, additive);
        }
        else {
            animationGroup.start(loop, speed, animationGroup.from, animationGroup.to, additive);
        }
        this.animationGroup = animationGroup;
    }
    getCameraTarget() {
        return this.entries?.rootNodes[0] ?? null;
    }
    applyInput(input, dt) {
        if (this.entries == null)
            return;
        const attrs = this;
        const speed = input.forward;
        const rotation = input.turn;
        const sprint = input.sprint;
        const sprintSpeed = speed * sprint;
        const totalSpeed = speed * attrs.forwardSpeed +
            sprintSpeed * (attrs.runSpeed - attrs.forwardSpeed);
        // Camera zoom from input
        if (this.camera instanceof BABYLON.FollowCamera) {
            this.camera.radius = lerp(attrs.cameraMinFollowDistance, attrs.cameraMaxFollowDistance, Math.max(0, Math.min(1, input.cameraZoom)));
        }
        // XR camera zoom from right stick
        if (input.cameraZoom !== 0 && this.xrStuff) {
            this.xrCamZoom += input.cameraZoom * 0.5 * dt;
            this.xrCamZoom = Math.max(0, Math.min(1, this.xrCamZoom));
        }
        for (const node of this.entries.rootNodes) {
            if (speed > 0) {
                node.moveWithCollisions(node.forward.scaleInPlace(totalSpeed * dt));
            }
            else if (speed < 0) {
                node.moveWithCollisions(node.forward.scaleInPlace(speed * dt * attrs.backwardSpeed));
            }
            node.rotate(BABYLON.Vector3.Up(), rotation * dt * attrs.turnSpeed * DEG_TO_RAD);
            // Gravity: only apply if not grounded (raycast down from feet)
            const feetY = node.position.y + 0.05;
            const rayOrigin = new BABYLON.Vector3(node.position.x, feetY, node.position.z);
            const ray = new BABYLON.Ray(rayOrigin, BABYLON.Vector3.Down(), 0.15);
            const hit = this.owner.scene.pickWithRay(ray, (m) => m !== node && m.checkCollisions);
            if (!hit?.hit) {
                const gravity = Math.min(0.1, 9.81 * dt);
                node.moveWithCollisions(new BABYLON.Vector3(0, -gravity, 0));
            }
            if (speed > 0.1) {
                if (sprintSpeed > 0.25) {
                    this.setAnimationState('run', sprintSpeed + 0.25);
                }
                else {
                    this.setAnimationState('walk', speed + 0.25);
                }
            }
            else if (speed < -0.1) {
                this.setAnimationState('walkBackwards', Math.abs(speed) + 0.25);
            }
            else if (Math.abs(rotation) > 0.1) {
                this.setAnimationState('walk', Math.abs(rotation * 0.5) + 0.25);
            }
            else {
                this.setAnimationState('idle');
            }
        }
    }
    setupXRInput(xr) {
        const controllerMap = xrControllers(xr);
        this.xrInputProvider = new XRInputProvider(controllerMap);
        // Add XR input to the composite provider
        if (this.inputProvider instanceof CompositeInputProvider) {
            this.inputProvider.add(this.xrInputProvider);
        }
    }
    async setupXRCamera() {
        if (this.owner == null)
            return;
        const scene = this.owner.scene;
        const mode = 'immersive-vr';
        if (navigator.xr == null)
            throw new Error('xr is not available');
        if (!(await navigator.xr.isSessionSupported(mode))) {
            throw new Error(`navigator.xr does not support requested mode "${mode}"`);
        }
        // Create XR experience first
        const xr = await scene.createDefaultXRExperienceAsync({
            uiOptions: { sessionMode: mode },
        });
        // Register controller observables BEFORE entering XR so we catch controller connect events
        this.setupXRInput(xr);
        // Now enter XR
        const { baseExperience } = xr;
        const { camera } = baseExperience;
        camera.name = this.cameraType;
        await baseExperience.enterXRAsync(mode, 'local-floor');
        this.xrStuff = {
            camera,
            xr,
            async exitXR() {
                await baseExperience.exitXRAsync();
            },
        };
        this.camera = camera;
        this.owner.xrActive = true;
        // Disable all default XR movement so we control it
        if (xr.teleportation) {
            xr.teleportation.dispose();
        }
        try {
            baseExperience.featuresManager.disableFeature(BABYLON.WebXRFeatureName.MOVEMENT);
        }
        catch (_) {
            // Feature may not be enabled
        }
        // Parent the XR camera to a container so we can move/rotate the rig
        // without fighting head tracking (head tracking applies as local transform on top)
        const camRig = new BABYLON.TransformNode('xr-rig', this.owner.scene);
        baseExperience.camera.parent = camRig;
        let lastTime = Date.now();
        let yawOffset = 0; // correction between XR reference space and Babylon world
        let currentYaw = 0;
        const currentPos = new BABYLON.Vector3();
        let firstFrame = true;
        baseExperience.sessionManager.onXRFrameObservable.add(() => {
            if (!this.entries)
                return;
            const now = Date.now();
            const dt = Math.min((now - lastTime) * 0.001, 0.1);
            lastTime = now;
            const node = this.entries.rootNodes[0];
            // Zoom: 0 = (1 back, 1 up), 1 = (5 back, 2 up), default 0.25 = (2 back, 1.25 up)
            const backDist = lerp(1, 5, this.xrCamZoom);
            const upDist = lerp(1, 2, this.xrCamZoom);
            // Target position: behind and above the character
            const behind = node.forward.scale(-backDist);
            const targetX = node.position.x + behind.x;
            const targetY = node.position.y + upDist;
            const targetZ = node.position.z + behind.z;
            // Target yaw: face same direction as character
            const fwd = node.forward;
            const targetYaw = Math.atan2(fwd.x, fwd.z);
            // On first frame, compute offset between where headset faces and where
            // it should face (character direction).
            if (firstFrame) {
                firstFrame = false;
                let headWorldYaw = 0;
                if (baseExperience.camera.rotationQuaternion) {
                    headWorldYaw =
                        baseExperience.camera.rotationQuaternion.toEulerAngles().y;
                }
                yawOffset = headWorldYaw;
                currentYaw = targetYaw - yawOffset;
            }
            const adjustedTargetYaw = targetYaw - yawOffset;
            const t = Math.min(1, 2 * dt);
            currentPos.x = lerp(currentPos.x, targetX, t);
            currentPos.y = lerp(currentPos.y, targetY, t);
            currentPos.z = lerp(currentPos.z, targetZ, t);
            let yawDiff = adjustedTargetYaw - currentYaw;
            while (yawDiff > Math.PI)
                yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI)
                yawDiff += Math.PI * 2;
            currentYaw += yawDiff * t;
            // Set rig transform, compensating for camera's local offset from head tracking
            const camLocal = baseExperience.camera.position;
            const yawQuat = BABYLON.Quaternion.RotationYawPitchRoll(currentYaw, 0, 0);
            const rotatedLocal = new BABYLON.Vector3();
            BABYLON.Vector3.TransformCoordinatesToRef(camLocal, BABYLON.Matrix.FromQuaternionToRef(yawQuat, BABYLON.Matrix.Identity()), rotatedLocal);
            camRig.position.set(currentPos.x - rotatedLocal.x, currentPos.y - rotatedLocal.y, currentPos.z - rotatedLocal.z);
            camRig.rotationQuaternion = yawQuat;
        });
    }
    async setupFollowCamera() {
        if (this.owner == null || this.entries == null)
            return;
        if (this.xrStuff) {
            await this.xrStuff.exitXR();
            this.owner.xrActive = false;
            this.xrStuff = undefined;
            this.xrInputProvider = undefined;
            // Remove XR provider from composite
            if (this.inputProvider instanceof CompositeInputProvider) {
                for (const p of this.inputProvider.providers) {
                    if (p instanceof XRInputProvider) {
                        this.inputProvider.remove(p);
                        break;
                    }
                }
            }
        }
        const attrs = this;
        // Target a point at chest height so the character is centered in frame
        const root = this.entries.rootNodes[0];
        const cameraTarget = new BABYLON.TransformNode('camera-target', this.owner.scene);
        cameraTarget.parent = root;
        cameraTarget.position.y = attrs.cameraTargetHeight;
        const followCamera = new BABYLON.FollowCamera('FollowCam', BABYLON.Vector3.Zero(), this.owner.scene);
        followCamera.radius = 5;
        followCamera.heightOffset = attrs.cameraHeightOffset;
        followCamera.rotationOffset = 180;
        followCamera.lockedTarget = cameraTarget;
        this.camera = followCamera;
        this.owner.setActiveCamera(followCamera, { attach: false });
    }
    connectedCallback() {
        super.connectedCallback();
        const attrs = this;
        if (attrs.player) {
            // Check if we're inside an inputFocus manager (it will wire input for us)
            const focusManager = this.closest('tosi-b3d-input-focus');
            if (!focusManager) {
                // Legacy: direct child of gameController
                const gcEl = this.closest('tosi-game-controller');
                this.gameController = gcEl;
                if (this.gameController) {
                    const composite = new CompositeInputProvider(this.gameController.getInputProvider());
                    this.inputProvider = composite;
                }
            }
        }
    }
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        if (attrs.url !== '' && !this.entries) {
            this.loadAssetContainer(scene, attrs.url, (container) => {
                this.entries = container.instantiateModelsToScene(undefined, false, {
                    doNotInstantiate: true,
                });
                if (this.entries.rootNodes.length !== 1) {
                    throw new Error('<tosi-b3d-biped> expects a container with exactly one root node');
                }
                const meshes = this.entries.rootNodes
                    .map((node) => node.getChildMeshes())
                    .flat();
                this.mesh = this.entries.rootNodes[0];
                this.mesh.ellipsoid = new BABYLON.Vector3(0.3, 0.75, 0.3);
                this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, 0.75, 0);
                this.mesh.checkCollisions = true;
                owner.register({ meshes });
                this.setAnimationState(attrs.initialState);
                // If inputFocus wired input before GLB loaded, it may have been
                // cleared by a dispose/re-init cycle. Re-wire directly.
                if (attrs.player && this.inputProvider == null) {
                    const focusManager = this.closest('tosi-b3d-input-focus');
                    if (focusManager?.inputMappedProvider) {
                        this.inputProvider = new CompositeInputProvider(focusManager.inputMappedProvider);
                    }
                }
                this.lastUpdate = Date.now();
                scene.registerBeforeRender(this._update);
                this.queueRender();
            });
        }
    }
    sceneDispose() {
        if (this.owner != null && this.entries) {
            this.owner.scene.unregisterBeforeRender(this._update);
            for (const node of this.entries.rootNodes) {
                node.dispose();
            }
            for (const skeleton of this.entries.skeletons) {
                skeleton.dispose();
            }
            for (const ag of this.entries.animationGroups) {
                ag.dispose();
            }
            this.entries = undefined;
        }
        this.gameController = undefined;
        this.inputProvider = null;
        this.xrInputProvider = undefined;
        super.sceneDispose();
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
    render() {
        if (!this.owner)
            return;
        super.render();
        if (this.entries == null)
            return;
        const attrs = this;
        if (attrs.animation !== '') {
            this.setAnimationState(attrs.animation, attrs.animationSpeed);
        }
        else if (this.animationGroup && attrs.animationSpeed !== undefined) {
            this.animationGroup.speedRatio = attrs.animationSpeed;
        }
        if (this.camera == null || this.camera.name !== attrs.cameraType) {
            switch (attrs.cameraType) {
                case 'xr':
                    this.setupXRCamera();
                    break;
                case 'follow':
                    this.setupFollowCamera();
                    break;
                default:
                    if (this.camera != null) {
                        if (this.owner?.camera === this.camera) {
                            this.owner.camera = undefined;
                        }
                        this.camera.dispose();
                        this.camera = undefined;
                    }
            }
        }
    }
}
export const b3dBiped = B3dBiped.elementCreator({ tag: 'tosi-b3d-biped' });
//# sourceMappingURL=b3d-biped.js.map