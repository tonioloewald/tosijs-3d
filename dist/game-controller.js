/*#
# game-controller

Input component that maps keyboard/mouse to a virtual gamepad and optionally
merges with a hardware gamepad. Produces `ControlInput` via an `InputMapping`.

Keyboard/mouse listening is built-in. For standalone keyboard-only or
hardware-only sources, see `KeyboardGamepadSource` and `HardwareGamepadSource`.

## Default Key Map

| VirtualGamepad | Keys |
|----------------|------|
| leftStick Y | W (+) / S (-) |
| leftStick X | D (+) / A (-) |
| rightStick X | ArrowRight (+) / ArrowLeft (-) |
| buttonA | Space |
| buttonB | F |
| buttonX | E |
| leftBumper | ShiftLeft |
| leftTrigger | Q |
| rightTrigger | R |
| dpadDown | G (toggle) |

Mouse wheel adjusts rightStick Y (for camera zoom).

## Usage

```javascript
import { gameController, b3dBiped, inputFocus, b3d } from 'tosijs-3d'

document.body.append(
  b3d({},
    inputFocus(
      gameController(),
      b3dBiped({ url: '/model.glb', player: true, cameraType: 'follow' })
    )
  )
)
```

## InputProvider

Call `getInputProvider(mapping?)` to get a `MappedInputProvider`. Default mapping is `bipedMapping`.
*/
/*{ "parent": "Input" }*/
import { Component } from 'tosijs';
import { emptyGamepad, MappedInputProvider, bipedMapping, } from './virtual-gamepad.js';
import { HardwareGamepadSource } from './hardware-gamepad.js';
function keycode(evt) {
    return evt.code.replace(/Key|Digit/, '');
}
function clamp(min, x, max) {
    return x < min ? min : x > max ? max : x;
}
const DEFAULT_AXES = [
    {
        field: 'leftStickY',
        positiveKeys: ['W'],
        negativeKeys: ['S'],
        attack: 2,
        decay: 5,
    },
    {
        field: 'leftStickX',
        positiveKeys: ['D'],
        negativeKeys: ['A'],
        attack: 2,
        decay: 5,
    },
    {
        field: 'rightStickX',
        positiveKeys: ['ArrowRight'],
        negativeKeys: ['ArrowLeft'],
        attack: 2,
        decay: 5,
    },
];
// Mouse buttons map to the three "fire" pad buttons via pseudo-keycodes (added to
// `pressedKeys` on a canvas click): LEFT = primary (buttonA), RIGHT = secondary
// (buttonB), MIDDLE = tertiary (rightBumper) — matching A / B / right-bumper.
const DEFAULT_BUTTONS = [
    { field: 'buttonA', keys: ['Space', 'Mouse0'], attack: 5, decay: 10 },
    { field: 'buttonB', keys: ['F', 'Mouse2'], attack: 5, decay: 10 },
    { field: 'buttonX', keys: ['E'], attack: 5, decay: 10 },
    { field: 'leftBumper', keys: ['ShiftLeft'], attack: 5, decay: 10 },
    {
        field: 'rightBumper',
        keys: ['ShiftRight', 'Mouse1'],
        attack: 5,
        decay: 10,
    },
    { field: 'leftTrigger', keys: ['Q'], attack: 5, decay: 10 },
    { field: 'rightTrigger', keys: ['R'], attack: 5, decay: 10 },
    { field: 'dpadDown', keys: ['G'], attack: 5, decay: 10, type: 'toggle' },
];
export class GameController extends Component {
    static preferredTagName = 'tosi-game-controller';
    static initAttributes = {
        wheelSensitivity: 1,
        updateIntervalMs: 33,
    };
    hardwareSource = new HardwareGamepadSource();
    provider = null;
    axes = DEFAULT_AXES;
    buttons = DEFAULT_BUTTONS;
    pressedKeys = new Set();
    axisState = {};
    buttonState = {};
    wheelAccum = 0;
    interval = 0;
    lastUpdate = 0;
    /** Poll keyboard/mouse state as a VirtualGamepad. */
    poll() {
        const pad = emptyGamepad();
        for (const axis of this.axes) {
            pad[axis.field] = this.axisState[axis.field] ?? 0;
        }
        for (const btn of this.buttons) {
            ;
            pad[btn.field] = this.buttonState[btn.field] ?? 0;
        }
        pad.rightStickY = clamp(-1, this.wheelAccum, 1);
        this.wheelAccum *= 0.8;
        return pad;
    }
    /** Returns a MappedInputProvider that merges keyboard + hardware gamepad. */
    getInputProvider(mapping) {
        if (!this.provider) {
            this.provider = new MappedInputProvider(mapping ?? bipedMapping, this, this.hardwareSource);
        }
        else if (mapping) {
            this.provider.setMapping(mapping);
        }
        return this.provider;
    }
    _handleKeyDown = (event) => {
        this.pressedKeys.add(keycode(event));
        for (const btn of this.buttons) {
            if (btn.type !== 'toggle')
                continue;
            if (btn.keys.some((k) => k === keycode(event))) {
                this.buttonState[btn.field] = 1 - (this.buttonState[btn.field] ?? 0);
            }
        }
    };
    _handleKeyUp = (event) => {
        this.pressedKeys.delete(keycode(event));
    };
    _handleWheel = (event) => {
        this.wheelAccum = clamp(-1, this.wheelAccum + event.deltaY * this.wheelSensitivity * 0.01, 1);
    };
    // Mouse fire buttons — pressed only when the click STARTS on a scene canvas, so
    // clicking UI (gear, panels, glass gamepad, doc links) never fires. Release is
    // ungated so dragging off the canvas can't stick a button on. Middle/right also
    // preventDefault (autoscroll / context menu).
    _handleMouseDown = (event) => {
        if (!(event.target instanceof HTMLCanvasElement))
            return;
        this.pressedKeys.add('Mouse' + event.button);
        if (event.button !== 0)
            event.preventDefault();
    };
    _handleMouseUp = (event) => {
        this.pressedKeys.delete('Mouse' + event.button);
    };
    _handleContextMenu = (event) => {
        // Suppress the browser menu so right-click can be "secondary fire" over the scene.
        if (event.target instanceof HTMLCanvasElement)
            event.preventDefault();
    };
    _updateSmoothing = () => {
        const now = Date.now();
        const dt = (now - this.lastUpdate) * 0.001;
        this.lastUpdate = now;
        for (const axis of this.axes) {
            const posPressed = axis.positiveKeys.some((k) => this.pressedKeys.has(k));
            const negPressed = axis.negativeKeys.some((k) => this.pressedKeys.has(k));
            let target = 0;
            if (posPressed && !negPressed)
                target = 1;
            else if (negPressed && !posPressed)
                target = -1;
            const current = this.axisState[axis.field] ?? 0;
            if (Math.abs(target) > Math.abs(current) ||
                Math.sign(target) !== Math.sign(current)) {
                const step = axis.attack * dt;
                if (Math.abs(target - current) < step) {
                    this.axisState[axis.field] = target;
                }
                else {
                    this.axisState[axis.field] =
                        current + Math.sign(target - current) * step;
                }
            }
            else {
                const step = axis.decay * dt;
                if (Math.abs(target - current) < step) {
                    this.axisState[axis.field] = target;
                }
                else {
                    this.axisState[axis.field] =
                        current + Math.sign(target - current) * step;
                }
            }
        }
        for (const btn of this.buttons) {
            if (btn.type === 'toggle')
                continue;
            const pressed = btn.keys.some((k) => this.pressedKeys.has(k));
            const current = this.buttonState[btn.field] ?? 0;
            if (pressed) {
                this.buttonState[btn.field] = Math.min(1, current + btn.attack * dt);
            }
            else {
                this.buttonState[btn.field] = Math.max(0, current - btn.decay * dt);
            }
        }
    };
    connectedCallback() {
        super.connectedCallback();
        this.pressedKeys = new Set();
        this.axisState = {};
        this.buttonState = {};
        this.lastUpdate = Date.now();
        this.interval = window.setInterval(this._updateSmoothing, this.updateIntervalMs);
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);
        window.addEventListener('wheel', this._handleWheel, { passive: false });
        window.addEventListener('mousedown', this._handleMouseDown);
        window.addEventListener('mouseup', this._handleMouseUp);
        window.addEventListener('contextmenu', this._handleContextMenu);
    }
    disconnectedCallback() {
        clearInterval(this.interval);
        this.interval = 0;
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
        window.removeEventListener('wheel', this._handleWheel);
        window.removeEventListener('mousedown', this._handleMouseDown);
        window.removeEventListener('mouseup', this._handleMouseUp);
        window.removeEventListener('contextmenu', this._handleContextMenu);
        super.disconnectedCallback();
    }
}
export const gameController = GameController.elementCreator();
//# sourceMappingURL=game-controller.js.map