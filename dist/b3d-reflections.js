import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
export class B3dReflections extends Component {
    static initAttributes = {
        refreshRate: 5,
        probeSize: 512,
        /** Distance beyond which probes stop updating entirely */
        maxDistance: 100,
        /** Distance at which probes switch from near to far refresh rate */
        farDistance: 30,
        /** Refresh rate for distant probes (higher = less frequent) */
        farRefreshRate: 30,
        /** How often (in frames) to re-check distances */
        distanceCheckInterval: 13,
    };
    owner = null;
    probes = [];
    nonMirrorMeshes = [];
    _callback;
    _observer;
    _frameCount = 0;
    addMeshesToProbes() {
        for (const { probe, mesh } of this.probes) {
            if (probe.renderList == null)
                continue;
            for (const m of this.nonMirrorMeshes) {
                if (m !== mesh && !probe.renderList.includes(m)) {
                    probe.renderList.push(m);
                }
            }
        }
    }
    createProbe(mesh) {
        if (this.owner == null)
            return;
        const material = mesh.material;
        if (material == null)
            return;
        const attrs = this;
        const probe = new BABYLON.ReflectionProbe(mesh.name.replace(/[_-]mirror/g, '_probe'), attrs.probeSize, this.owner.scene);
        try {
            probe.attachToMesh(mesh);
            probe.refreshRate = attrs.refreshRate;
            if (material instanceof BABYLON.PBRMaterial) {
                material.reflectionTexture = probe.cubeTexture;
                // If the material is transmissive (glass, etc.), replace the glTF
                // screen-space refraction with the probe cubemap. The glTF loader's
                // configureTransmission() sets volumeIndexOfRefraction=1 and
                // thickness=0 (thin-surface mode), which kills visible refraction.
                // We restore proper IOR so the refraction ray actually bends.
                if (material.subSurface.isRefractionEnabled) {
                    material.subSurface.refractionTexture = probe.cubeTexture;
                    // Undo thin-surface overrides from glTF's configureTransmission()
                    material.subSurface.volumeIndexOfRefraction =
                        material.indexOfRefraction;
                    material.subSurface.useAlbedoToTintRefraction = true;
                }
            }
            else if (material instanceof BABYLON.StandardMaterial) {
                material.backFaceCulling = true;
                material.reflectionTexture = probe.cubeTexture;
                material.reflectionFresnelParameters = new BABYLON.FresnelParameters();
                material.reflectionFresnelParameters.bias = 0.02;
            }
            const frameOffset = Math.floor(Math.random() * attrs.distanceCheckInterval);
            this.probes.push({ probe, mesh, frameOffset });
            this.addMeshesToProbes();
        }
        catch (e) {
            console.error(`Failed to make "${mesh.name}" reflective:`, e);
            probe.dispose();
        }
    }
    makeReflectiveCallback(additions) {
        if (this.owner == null)
            return;
        const { meshes } = additions;
        if (meshes == null)
            return;
        for (const mesh of meshes) {
            if (mesh.name.includes('_mirror') || mesh.name.includes('-mirror')) {
                this.createProbe(mesh);
            }
            else {
                this.nonMirrorMeshes.push(mesh);
            }
        }
        // update all probes with any new non-mirror meshes
        this.addMeshesToProbes();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    updateProbeRate(probe, mesh, camPos) {
        const attrs = this;
        const dist = BABYLON.Vector3.Distance(camPos, mesh.absolutePosition);
        if (dist > attrs.maxDistance) {
            probe.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        }
        else if (dist <= attrs.farDistance) {
            probe.refreshRate = attrs.refreshRate;
        }
        else {
            const t = (dist - attrs.farDistance) / (attrs.maxDistance - attrs.farDistance);
            probe.refreshRate = Math.round(attrs.refreshRate + t * (attrs.farRefreshRate - attrs.refreshRate));
        }
    }
    sceneReady(owner, _scene) {
        this.owner = owner;
        this._callback = this.makeReflectiveCallback.bind(this);
        owner.onSceneAddition(this._callback);
        const attrs = this;
        this._observer = owner.scene.onBeforeRenderObservable.add(() => {
            const frame = this._frameCount++;
            const interval = attrs.distanceCheckInterval;
            const camera = owner.scene.activeCamera;
            if (camera == null)
                return;
            const camPos = camera.globalPosition;
            for (const { probe, mesh, frameOffset } of this.probes) {
                if ((frame + frameOffset) % interval === 0) {
                    this.updateProbeRate(probe, mesh, camPos);
                }
            }
        });
    }
    sceneDispose() {
        if (this.owner != null) {
            if (this._callback) {
                this.owner.offSceneAddition(this._callback);
            }
            if (this._observer) {
                this.owner.scene.onBeforeRenderObservable.remove(this._observer);
                this._observer = undefined;
            }
        }
        for (const { probe } of this.probes) {
            probe.dispose();
        }
        this.probes = [];
        this.nonMirrorMeshes = [];
        this.owner = null;
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
}
export const b3dReflections = B3dReflections.elementCreator({
    tag: 'tosi-b3d-reflections',
});
//# sourceMappingURL=b3d-reflections.js.map