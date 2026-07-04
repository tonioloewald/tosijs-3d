import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils';
/** A 2×2 checker drawn to a DynamicTexture — no external asset, tiles via uScale/vScale. */
function makeCheckerTexture(name, scene, colorA = '#9a9a9a', colorB = '#767676') {
    const size = 128;
    const tex = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, false);
    const ctx = tex.getContext();
    const half = size / 2;
    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = colorB;
    ctx.fillRect(0, 0, half, half);
    ctx.fillRect(half, half, half, half);
    tex.update();
    return tex;
}
export class B3dSphere extends AbstractMesh {
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'sphere',
        segments: 16,
        diameter: 1,
        color: '#ff0000',
        mirror: false,
    };
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName;
        this.mesh = BABYLON.MeshBuilder.CreateSphere(meshName, {
            segments: attrs.segments,
            diameter: attrs.diameter,
        }, scene);
        if (attrs.mirror) {
            const material = new BABYLON.PBRMaterial(meshName + '-mat', scene);
            material.albedoColor = BABYLON.Color3.FromHexString(attrs.color);
            material.metallic = 1;
            material.roughness = 0.05;
            this.mesh.material = material;
        }
        else {
            const material = new BABYLON.StandardMaterial(meshName + '-mat', scene);
            material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color);
            this.mesh.material = material;
        }
        owner.register({ meshes: [this.mesh] });
    }
}
export const b3dSphere = B3dSphere.elementCreator({ tag: 'tosi-b3d-sphere' });
export class B3dBox extends AbstractMesh {
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'box',
        size: 1,
        width: 0, // 0 = use size
        height: 0,
        depth: 0,
        color: '#ff0000',
        mirror: false,
    };
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        const meshName = attrs.mirror ? attrs.meshName + '_mirror' : attrs.meshName;
        this.mesh = BABYLON.MeshBuilder.CreateBox(meshName, {
            size: attrs.size,
            width: attrs.width || attrs.size,
            height: attrs.height || attrs.size,
            depth: attrs.depth || attrs.size,
        }, scene);
        if (attrs.mirror) {
            const material = new BABYLON.PBRMaterial(meshName + '-mat', scene);
            material.albedoColor = BABYLON.Color3.FromHexString(attrs.color);
            material.metallic = 1;
            material.roughness = 0.05;
            this.mesh.material = material;
        }
        else {
            const material = new BABYLON.StandardMaterial(meshName + '-mat', scene);
            material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color);
            this.mesh.material = material;
        }
        owner.register({ meshes: [this.mesh] });
    }
}
export const b3dBox = B3dBox.elementCreator({ tag: 'tosi-b3d-box' });
export class B3dGround extends AbstractMesh {
    static initAttributes = {
        ...AbstractMesh.initAttributes,
        meshName: 'ground',
        size: 0, // square shortcut; >0 overrides width/height
        width: 4,
        height: 4,
        color: '#888888',
        // Optional surface texture on the (shadow-receiving) StandardMaterial:
        // an image URL, or the built-in procedural value `'checker'`. Empty = flat
        // `color`. `textureTiles` sets the repeat count across the plane.
        texture: '',
        textureTiles: 8,
    };
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        const attrs = this;
        const meshName = attrs.meshName || 'ground';
        this.mesh = BABYLON.MeshBuilder.CreateGround(meshName, {
            width: attrs.size || attrs.width,
            height: attrs.size || attrs.height,
        }, scene);
        const material = new BABYLON.StandardMaterial(meshName + '-mat', scene);
        material.diffuseColor = BABYLON.Color3.FromHexString(attrs.color);
        if (attrs.texture) {
            const tiles = Math.max(1, attrs.textureTiles);
            const tex = attrs.texture === 'checker'
                ? makeCheckerTexture(meshName + '-tex', scene, attrs.color)
                : new BABYLON.Texture(attrs.texture, scene);
            tex.uScale = tiles;
            tex.vScale = tiles;
            material.diffuseTexture = tex;
            material.diffuseColor = BABYLON.Color3.White();
            material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        }
        this.mesh.material = material;
        // Opt into collisions so character controllers (biped/car) can stand on it —
        // their grounding probe and moveWithCollisions only see `checkCollisions` meshes.
        this.mesh.checkCollisions = true;
        owner.register({ meshes: [this.mesh] });
    }
}
export const b3dGround = B3dGround.elementCreator({ tag: 'tosi-b3d-ground' });
//# sourceMappingURL=b3d-primitives.js.map