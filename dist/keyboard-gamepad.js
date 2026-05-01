/*#
# keyboard-gamepad

Maps keyboard and mouse input to a `VirtualGamepad`. Uses attack/decay smoothing
for responsive analog-feel from digital keys.

## Default Key Map

| VirtualGamepad | Keys |
|----------------|------|
| leftStick Y | W (+) / S (-) |
| leftStick X | D (+) / A (-) |
| rightStick Y | ArrowUp (+) / ArrowDown (-) |
| rightStick X | ArrowRight (+) / ArrowLeft (-) |
| buttonA | Space |
| buttonB | F |
| buttonX | E |
| leftBumper | ShiftLeft |
| leftTrigger | Q |
| rightTrigger | R |
| buttonY | Y |
| rightBumper | ShiftRight |
| dpadUp/Down/Left/Right | I / M / J / K |

Mouse wheel adjusts rightStick Y (for camera zoom).
*/
import { Component } from 'tosijs';
import { emptyGamepad } from './virtual-gamepad';
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
    {
        field: 'rightStickY',
        positiveKeys: ['ArrowUp'],
        negativeKeys: ['ArrowDown'],
        attack: 2,
        decay: 5,
    },
];
const DEFAULT_BUTTONS = [
    { field: 'buttonA', keys: ['Space'], attack: 5, decay: 10 },
    { field: 'buttonB', keys: ['F'], attack: 5, decay: 10 },
    { field: 'buttonX', keys: ['E'], attack: 5, decay: 10 },
    { field: 'leftBumper', keys: ['ShiftLeft'], attack: 5, decay: 10 },
    { field: 'leftTrigger', keys: ['Q'], attack: 5, decay: 10 },
    { field: 'rightTrigger', keys: ['R'], attack: 5, decay: 10 },
    { field: 'buttonY', keys: ['Y'], attack: 5, decay: 10 },
    { field: 'rightBumper', keys: ['ShiftRight'], attack: 5, decay: 10 },
    { field: 'dpadUp', keys: ['I'], attack: 5, decay: 10 },
    { field: 'dpadDown', keys: ['M'], attack: 5, decay: 10 },
    { field: 'dpadLeft', keys: ['J'], attack: 5, decay: 10 },
    { field: 'dpadRight', keys: ['K'], attack: 5, decay: 10 },
];
export class KeyboardGamepadSource extends Component {
    static initAttributes = {
        wheelSensitivity: 1,
        updateIntervalMs: 33,
    };
    axes = DEFAULT_AXES;
    buttons = DEFAULT_BUTTONS;
    pressedKeys = new Set();
    axisState = {};
    buttonState = {};
    wheelAccum = 0;
    interval = 0;
    lastUpdate = 0;
    poll() {
        const pad = emptyGamepad();
        for (const axis of this.axes) {
            pad[axis.field] = this.axisState[axis.field] ?? 0;
        }
        for (const btn of this.buttons) {
            ;
            pad[btn.field] = this.buttonState[btn.field] ?? 0;
        }
        // Mouse wheel → rightStickY (merged with arrow keys via max-abs)
        const wheel = clamp(-1, this.wheelAccum, 1);
        if (Math.abs(wheel) > Math.abs(pad.rightStickY)) {
            pad.rightStickY = wheel;
        }
        this.wheelAccum *= 0.8; // decay wheel toward 0
        return pad;
    }
    _isMappedKey(code) {
        for (const axis of this.axes) {
            if (axis.positiveKeys.includes(code) || axis.negativeKeys.includes(code))
                return true;
        }
        for (const btn of this.buttons) {
            if (btn.keys.includes(code))
                return true;
        }
        return false;
    }
    _handleKeyDown = (event) => {
        const code = keycode(event);
        if (this._isMappedKey(code))
            event.preventDefault();
        this.pressedKeys.add(code);
        // Handle toggles on press
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
    _updateSmoothing = () => {
        const now = Date.now();
        const dt = (now - this.lastUpdate) * 0.001;
        this.lastUpdate = now;
        // Axes: positive/negative keys produce -1..1
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
                // Moving toward target: use attack rate
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
                // Decaying toward target: use decay rate
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
        // Buttons (non-toggle): 0..1 with attack/decay
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
        window.addEventListener('wheel', this._handleWheel, {
            passive: false,
        });
    }
    disconnectedCallback() {
        clearInterval(this.interval);
        this.interval = 0;
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
        window.removeEventListener('wheel', this._handleWheel);
        super.disconnectedCallback();
    }
}
export const keyboardGamepad = KeyboardGamepadSource.elementCreator({
    tag: 'tosi-keyboard-gamepad',
});
//# sourceMappingURL=keyboard-gamepad.js.map