import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import { actualMeshes } from './b3d-utils';
export class B3dSun extends Component {
    static initAttributes = {
        bias: 0.001,
        normalBias: 0.01,
        shadowMaxZ: 100,
        shadowMinZ: 0.01,
        shadowDarkness: 0.1,
        shadowTextureSize: 1024,
        shadowCascading: false,
        activeDistance: 30,
        frustumEdgeFalloff: 0,
        forceBackFacesOnly: true,
        x: 0,
        y: -1,
        z: -0.5,
        intensity: 1,
        updateIntervalMs: 1000,
    };
    owner = null;
    light;
    shadowGenerator;
    shadowCasters = [];
    activeShadowCasters = [];
    interval = 0;
    _callback;
    _update;
    shadowCallback(additions) {
        const { meshes } = additions;
        if (meshes == null)
            return;
        for (const mesh of actualMeshes(meshes)) {
            if (!mesh.name.includes('_nocast') &&
                !mesh.name.includes('-nocast') &&
                !this.shadowCasters.includes(mesh)) {
                this.shadowCasters.push(mesh);
            }
            mesh.receiveShadows =
                !mesh.name.includes('_noshadow') && !mesh.name.includes('-noshadow');
        }
    }
    baseIntensity = 1;
    update() {
        if (this.light == null || this.owner?.scene == null)
            return;
        // Get the actual world-space position of the active camera
        const activeCamera = this.owner.scene.activeCamera;
        if (activeCamera == null)
            return;
        const target = activeCamera.globalPosition;
        this.light.position.x = target.x;
        this.light.position.y = target.y + 10;
        this.light.position.z = target.z;
        // Dim sun when camera is underwater
        const waterMesh = this.owner.scene.getMeshByName('water_nocast');
        if (waterMesh) {
            const waterY = waterMesh.absolutePosition.y;
            if (target.y < waterY) {
                const depth = waterY - target.y;
                const dimFactor = Math.max(0.05, 1 - depth * 0.5);
                this.light.intensity = this.baseIntensity * dimFactor;
            }
            else {
                this.light.intensity = this.baseIntensity;
            }
        }
        const activeDistance = this.activeDistance;
        for (const mesh of this.shadowCasters) {
            const distance = mesh.getAbsolutePosition().subtract(target).length();
            if (distance < activeDistance) {
                if (!this.activeShadowCasters.includes(mesh)) {
                    this.activeShadowCasters.push(mesh);
                    this.shadowGenerator.addShadowCaster(mesh);
                }
            }
            else {
                const idx = this.activeShadowCasters.indexOf(mesh);
                if (idx > -1) {
                    this.activeShadowCasters.splice(idx, 1);
                    this.shadowGenerator.removeShadowCaster(mesh);
                }
            }
        }
    }
    connectedCallback() {
        super.connectedCallback();
    }
    sceneReady(owner, scene) {
        this.owner = owner;
        const attrs = this;
        this._update = this.update.bind(this);
        this.interval = window.setInterval(this._update, attrs.updateIntervalMs);
        const light = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(attrs.x, attrs.y, attrs.z), scene);
        light.intensity = attrs.intensity;
        this.baseIntensity = attrs.intensity;
        this.light = light;
        if (attrs.shadowCascading) {
            this.shadowGenerator = new BABYLON.CascadedShadowGenerator(attrs.shadowTextureSize, light);
        }
        else {
            this.shadowGenerator = new BABYLON.ShadowGenerator(attrs.shadowTextureSize, light);
        }
        this._callback = this.shadowCallback.bind(this);
        owner.onSceneAddition(this._callback);
    }
    sceneDispose() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = 0;
        }
        if (this.owner && this._callback) {
            this.owner.offSceneAddition(this._callback);
        }
        if (this.light != null) {
            this.light.dispose();
            this.light = undefined;
            this.shadowGenerator = undefined;
        }
        this.shadowCasters = [];
        this.activeShadowCasters = [];
        this.owner = null;
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
    render() {
        super.render();
        const attrs = this;
        if (this.light != null && this.shadowGenerator != null) {
            this.light.direction.x = attrs.x;
            this.light.direction.y = attrs.y;
            this.light.direction.z = attrs.z;
            this.baseIntensity = attrs.intensity;
            // Soften shadows when light is dim (moonlight)
            const darkness = attrs.intensity < 0.5
                ? attrs.shadowDarkness + (1 - attrs.shadowDarkness) * 0.6
                : attrs.shadowDarkness;
            this.shadowGenerator.setDarkness(darkness);
            if (attrs.shadowCascading) {
                ;
                this.shadowGenerator.shadowMaxZ =
                    attrs.shadowMaxZ;
            }
            else {
                this.shadowGenerator.bias = attrs.bias;
                this.shadowGenerator.normalBias = attrs.normalBias;
                this.light.shadowMaxZ = attrs.shadowMaxZ;
                this.light.shadowMinZ = attrs.shadowMinZ;
                this.shadowGenerator.useContactHardeningShadow = true;
                this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
                this.shadowGenerator.frustumEdgeFalloff = attrs.frustumEdgeFalloff;
                this.shadowGenerator.forceBackFacesOnly = attrs.forceBackFacesOnly;
                this.shadowGenerator.setDarkness(attrs.shadowDarkness);
            }
        }
    }
}
export const b3dSun = B3dSun.elementCreator({ tag: 'tosi-b3d-sun' });
//# sourceMappingURL=b3d-shadows.js.map