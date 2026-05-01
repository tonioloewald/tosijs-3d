import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
export class B3dLight extends Component {
    static initAttributes = {
        x: 0,
        y: 1,
        z: 0,
        intensity: 1,
        diffuse: '#ffffff',
        specular: '#808080',
    };
    owner = null;
    light;
    connectedCallback() {
        super.connectedCallback();
    }
    sceneReady(owner, scene) {
        this.owner = owner;
        const attrs = this;
        this.light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(attrs.x, attrs.y, attrs.z), scene);
        owner.register({ lights: [this.light] });
    }
    sceneDispose() {
        if (this.light != null) {
            this.light.dispose();
            this.light = undefined;
        }
        this.owner = null;
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
    render() {
        super.render();
        if (this.light != null) {
            const attrs = this;
            this.light.direction = new BABYLON.Vector3(attrs.x, attrs.y, attrs.z);
            this.light.intensity = attrs.intensity;
            this.light.diffuse = BABYLON.Color3.FromHexString(attrs.diffuse);
            this.light.specular = BABYLON.Color3.FromHexString(attrs.specular);
        }
    }
}
export const b3dLight = B3dLight.elementCreator({ tag: 'tosi-b3d-light' });
//# sourceMappingURL=b3d-light.js.map