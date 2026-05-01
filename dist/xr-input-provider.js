import { emptyInput } from './control-input';
export class XRInputProvider {
    controllerMap;
    constructor(controllerMap) {
        this.controllerMap = controllerMap;
    }
    poll() {
        const input = emptyInput();
        if (this.controllerMap == null)
            return input;
        const left = this.controllerMap['left'];
        if (left?.['xr-standard-thumbstick']) {
            const axes = left['xr-standard-thumbstick'].axes;
            if (Math.abs(axes.y) > 0.1)
                input.forward = -axes.y;
            if (Math.abs(axes.x) > 0.1)
                input.turn = axes.x;
        }
        const right = this.controllerMap['right'];
        if (right?.['xr-standard-thumbstick']) {
            const axes = right['xr-standard-thumbstick'].axes;
            if (Math.abs(axes.y) > 0.1)
                input.cameraZoom = axes.y;
        }
        return input;
    }
}
//# sourceMappingURL=xr-input-provider.js.map