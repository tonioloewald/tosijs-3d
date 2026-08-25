/*#
# glass-gamepad (b3dGamepad)

A **split** on-screen ("glass") gamepad for touch contexts, as a Component (so
it's both the overlay element *and* a [[virtual-gamepad]] `GamepadSource`, like
`gameController`/`keyboardGamepad`). Instead of one controller body, the controls
are grouped into independently-anchored clusters, each a small SVG pinned to a
corner of the view:

| Cluster | Default anchor | Controls |
| --- | --- | --- |
| `left` | bottom-left | left stick, d-pad, left bumper/trigger |
| `right` | bottom-right | A/B/X/Y, right stick, right bumper/trigger |
| `top` | top-center | view, menu |

Each cluster is loaded from a self-contained SVG (default `/gamepad-left.svg`,
`/gamepad-right.svg`, `/gamepad-top.svg`) whose paths are labelled by `id`
(copied to `data-part` on load). There's no outer shell — just the clusters.

Usually you don't place this yourself: set the `gamepad` attribute on
[[tosi-b3d]] and it mounts one and wires it into the active input system. Placed
directly, it's a `GamepadSource` whose `poll()` merges all clusters.

```js
import { b3d, b3dGamepad, b3dSkybox } from 'tosijs-3d'
import { demoSun, patternGround } from 'demo-utils'
import { elements } from 'tosijs'
const { div, pre } = elements

// fade OFF in the demo: this page is where you LOOK at the pad, and any
// keypress (a doc search, a scroll with the arrow keys) would fade it out
// mid-inspection. Pointer movement no longer fades it — see `_watchRealInput`.
const pad = b3dGamepad({ fade: 'off' })
const readout = pre({ class: 'readout' })
let rover, mat

const scene = b3d(
  {
    sceneCreated(el, BABYLON) {
      // FIXED view (no attachControl) so the pad owns every pointer — you drag a stick, not the
      // camera. This is the rare demo where a hand-rolled camera is right: the pad is the subject.
      const cam = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.4, 13, new BABYLON.Vector3(0, 0.6, 0), el.scene)
      el.setActiveCamera(cam)
      rover = BABYLON.MeshBuilder.CreateBox('rover', { width: 1.4, height: 0.8, depth: 1.4 }, el.scene)
      rover.position.y = 0.5
      mat = new BABYLON.StandardMaterial('rover-mat', el.scene)
      mat.diffuseColor = new BABYLON.Color3(0.35, 0.6, 0.95)
      rover.material = mat
      el.register?.({ meshes: [rover] }) // cast a shadow
      el.scene.registerBeforeRender(() => {
        const s = pad.poll()
        // left stick drives it around; right stick spins it; A hops; B/X/Y recolour it.
        rover.position.x = Math.max(-9, Math.min(9, rover.position.x + s.leftStickX * 0.12))
        rover.position.z = Math.max(-9, Math.min(9, rover.position.z - s.leftStickY * 0.12))
        rover.rotation.y += s.rightStickX * 0.06
        const lift = s.buttonA > 0.5 ? 1.7 : 0.5
        rover.position.y += (lift - rover.position.y) * 0.2
        if (s.buttonB > 0.5) mat.diffuseColor.set(0.95, 0.4, 0.35)
        else if (s.buttonX > 0.5) mat.diffuseColor.set(0.4, 0.9, 0.55)
        else if (s.buttonY > 0.5) mat.diffuseColor.set(0.95, 0.85, 0.35)
        const held = ['A', 'B', 'X', 'Y'].filter((b) => s['button' + b] > 0.5)
        readout.textContent =
          `L ${s.leftStickX.toFixed(2)},${s.leftStickY.toFixed(2)}   R ${s.rightStickX.toFixed(2)},${s.rightStickY.toFixed(2)}` +
          (held.length ? '   ' + held.join(' ') : '')
      })
    },
  },
  demoSun(),
  b3dSkybox({ timeOfDay: 11 }),
  patternGround({ size: 22 }),
)

// The pad clusters pin to the corners, OVER the scene — touch/drag them to drive the cube.
preview.append(div({ class: 'glass-stage' }, scene, pad, readout))
```
```css
.glass-stage {
  position: relative;
  height: 100%;
  min-height: 340px;
  background: #0b0f14;
  border-radius: 8px;
  overflow: hidden;
}
.glass-stage tosi-b3d,
.glass-stage tosi-b3d-gamepad {
  position: absolute;
  inset: 0;
}
.glass-stage .readout {
  position: absolute;
  top: 10px;
  left: 12px;
  margin: 0;
  padding: 4px 8px;
  background: #222;
  border-radius: 5px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #fff;
  white-space: pre;
  pointer-events: none;
}
```

## Attributes

| Attribute | Default | Purpose |
| --- | --- | --- |
| `controls` | `''` (all) | **Comma**-separated piece list, e.g. `'a,b,right_stick(40,0),menu'`. Empty (the default) shows everything. `a/b/x/y` map to `A/B/X/Y`; `dpad` expands to the four directions; `name(dx,dy)` nudges one piece |
| `fade` | `'on'` | Hide the pad once a real input device is in use. `'off'` pins it visible — what you want on a page where the pad itself is the subject |
| `idleSeconds` | `10` | Seconds of silence before a faded pad comes back |
| `fadedOpacity` | `0` | How faded is faded. `0` is invisible; a low value like `0.15` leaves a hint that the fallback exists |

### What fading listens to, and what it ignores

Only a **keypress** or a **physical gamepad** fades the pad. The pointer never
does — not touch, not mouse, not trackpad.

That is a deliberate asymmetry rather than an oversight. The pad is *operable by
pointer*: `pointerdown` drives the sticks. So fading on pointer movement meant it
vanished exactly as you reached for it — you moved the mouse to click a stick and
your target disappeared. A keypress is the honest signal, because it is the one
that actually implies an on-screen fallback isn't needed.

If the pad is disappearing on you during development, `fade="off"` (or
`setFade(false)`) pins it; `faded` reports the current state.
*/
/*{ "parent": "Input" }*/
import { isOff } from './b3d-utils';
import { Component, elements, StyleSheet } from 'tosijs';
import { TouchGamepadSource } from './touch-gamepad';
import { emptyGamepad, mergeGamepads, } from './virtual-gamepad';
const { div } = elements;
// Offsets in cqmin so they scale with the host container (see `container-type`).
const ANCHOR_CSS = {
    'bottom-left': 'left:2cqmin;bottom:2cqmin',
    'bottom-right': 'right:2cqmin;bottom:2cqmin',
    'bottom-center': 'left:50%;bottom:2cqmin;transform:translateX(-50%)',
    'top-left': 'left:2cqmin;top:2cqmin',
    'top-right': 'right:2cqmin;top:2cqmin',
    'top-center': 'left:50%;top:2cqmin;transform:translateX(-50%)',
};
// Light-DOM component, so the host page (or b3d) can style the clusters and the
// `.active` press highlight reaches them. Inject the layout + default highlight
// once, scoped to the tag. `container-type: size` makes the cluster cqmin units
// scale to the host's own size (the demo card / the b3d view), not the viewport.
function ensureGamepadStyles() {
    if (typeof document === 'undefined')
        return;
    // StyleSheet dedups by id and is idempotent, so no manual guard is needed.
    StyleSheet('tosi-b3d-gamepad-styles', {
        'tosi-b3d-gamepad': {
            position: 'absolute',
            inset: 0,
            display: 'block',
            pointerEvents: 'none',
            zIndex: 15,
            containerType: 'size',
        },
        'tosi-b3d-gamepad .pad-clusters': {
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
        },
        'tosi-b3d-gamepad [data-part]': {
            opacity: 0.25,
            strokeWidth: 8,
            transition: 'stroke-width .08s, filter .08s',
        },
        'tosi-b3d-gamepad [data-part].active': {
            opacity: 0.75,
            strokeWidth: 16,
            filter: 'brightness(1.35)',
        },
    });
}
// The static cluster SVGs label paths by `id`; copy these (only) to `data-part`
// so TouchGamepadSource finds them — and so multiple instances don't clash on a
// global id.
const PART_IDS = new Set([
    'A',
    'B',
    'X',
    'Y',
    'left_bumper',
    'right_bumper',
    'left_trigger',
    'right_trigger',
    'dpad_up',
    'dpad_down',
    'dpad_left',
    'dpad_right',
    'menu',
    'view',
    'left_stick',
    'left_stick_travel',
    'right_stick',
    'right_stick_travel',
]);
const DEFAULTS = {
    left: { url: '/gamepad-left.svg', anchor: 'bottom-left', vmin: 42 },
    right: { url: '/gamepad-right.svg', anchor: 'bottom-right', vmin: 42 },
    top: { url: '/gamepad-top.svg', anchor: 'top-center', vmin: 28 },
};
// Which controls each cluster owns — used to skip empty clusters and to hide
// controls that weren't requested. Sticks list both knob and travel.
const CLUSTER_PARTS = {
    left: [
        'left_stick',
        'left_stick_travel',
        'dpad_up',
        'dpad_down',
        'dpad_left',
        'dpad_right',
        'left_bumper',
        'left_trigger',
    ],
    right: [
        'A',
        'B',
        'X',
        'Y',
        'right_stick',
        'right_stick_travel',
        'right_bumper',
        'right_trigger',
    ],
    top: ['menu', 'view'],
};
const NAME_ALIASES = {
    a: ['A'],
    b: ['B'],
    x: ['X'],
    y: ['Y'],
    dpad: ['dpad_up', 'dpad_down', 'dpad_left', 'dpad_right'],
};
/**
 * Parse a gamepad spec — e.g. `"a,b,right_stick(40,0),menu"` — into the controls
 * to show and any per-piece offsets. `''` / `'true'` → all controls. `a/b/x/y`
 * map to `A/B/X/Y`; `dpad` expands to the four directions.
 */
export function parseGamepadControls(spec) {
    const offsets = {};
    const s = spec.trim();
    if (s === '' || s === 'true')
        return { offsets }; // all controls
    const controls = [];
    /*
    Tokenise, do NOT `split(',')`.
  
    The offset syntax contains a comma — `right_stick(40,0)` — so splitting on
    commas tore it into `right_stick(40` and `0)`, neither of which matches the
    token pattern. Both were silently dropped: the piece vanished from the pad AND
    its offset was lost, with no error. The example in this function's own JSDoc
    could not parse.
  
    Matching whole tokens instead means the comma inside the parens belongs to the
    token, which is what anyone writing it expects.
    */
    for (const token of s.match(/[A-Za-z_]+(?:\([^)]*\))?/g) ?? []) {
        const m = token
            .trim()
            .match(/^([A-Za-z_]+)(?:\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\))?$/);
        if (m == null)
            continue;
        const names = NAME_ALIASES[m[1].toLowerCase()] ?? [m[1].toLowerCase()];
        for (const n of names) {
            controls.push(n);
            if (m[2] != null)
                offsets[n] = { x: Number(m[2]), y: Number(m[3]) };
        }
    }
    return { controls, offsets };
}
async function loadCluster(url) {
    const res = await fetch(url);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    for (const el of Array.from(svg.querySelectorAll('*'))) {
        // id → data-part (known parts only): so the source binds, and so global ids
        // don't collide if two gamepads are mounted.
        const id = el.getAttribute('id');
        if (id != null && PART_IDS.has(id)) {
            el.setAttribute('data-part', id);
            el.removeAttribute('id');
        }
        // Inline style → presentation attributes. The exported art bakes
        // fill/stroke/stroke-width into `style`, and inline style outranks every
        // stylesheet — so the `.active` highlight (and any themed/dynamic stroke)
        // could never override it. As attributes they're overridable, matching how
        // gamepad-svg.ts builds its themeable paths.
        const style = el.getAttribute('style');
        if (style != null) {
            for (const decl of style.split(';')) {
                const i = decl.indexOf(':');
                if (i < 0)
                    continue;
                const prop = decl.slice(0, i).trim();
                const val = decl.slice(i + 1).trim();
                if (prop !== '' && val !== '' && !el.hasAttribute(prop)) {
                    el.setAttribute(prop, val);
                }
            }
            el.removeAttribute('style');
        }
    }
    return svg;
}
/**
 * The split touch gamepad as a Component: the element is a full-bleed overlay
 * (pointer-events pass through except on the clusters), and the element *is* the
 * `GamepadSource` — `poll()` merges every loaded cluster. b3dInputFocus finds it
 * and adds it to the active input provider.
 */
export class B3dGamepad extends Component {
    kind = 'glass';
    static initAttributes = {
        /** Spec string: `''`/`true` = full layout, else e.g. `"a,b,left_stick"`. */
        controls: '',
        /** Scale all clusters while keeping them anchored. */
        scale: 1,
        deadzone: 0.15,
        maxZone: 0.85,
        /** Seconds of no keyboard/gamepad input before the pad fades back in. */
        idleSeconds: 10,
        /** `'off'` keeps the pad visible whatever else you're holding — for
         * screenshots, desktop demos, or a scene where it IS the control. */
        fade: 'on',
        /** Opacity while a real input device is in use (0 = invisible). */
        fadedOpacity: 0,
    };
    // No styleSpec → light DOM, so page/b3d CSS reaches the clusters and the
    // `.active` press highlight applies. Styling is injected globally (scoped to
    // the tag) by ensureGamepadStyles().
    content = [div({ class: 'pad-clusters', part: 'clusters' })];
    /** Advanced: per-cluster url/anchor/vmin overrides, or `false` to omit one. */
    clusters;
    handleButton;
    sources = [];
    built = false;
    connectedCallback() {
        super.connectedCallback();
        ensureGamepadStyles();
        if (!this.built) {
            this.built = true;
            void this._build();
        }
        this._watchRealInput();
    }
    /**
     * FADE OUT when a real input device shows up, back IN after `idleSeconds`
     * of silence. On-screen controls are a fallback for a device with no
     * keyboard or gamepad; on a laptop they sit on top of the view being useless
     * — but removing them outright breaks the tablet case, and a manual toggle
     * is a setting nobody finds.
     *
     * WHAT COUNTS AS "a real input device": a **keypress**, or a **physical
     * gamepad**. Deliberately NOT the pointer, in any of its flavours:
     *
     * - **Touch** — touching the glass pad IS using it, so it must not fade away
     *   under your thumb.
     * - **Mouse / trackpad** — a pointer proves nothing about whether there's a
     *   keyboard, and the pad is fully operable by pointer (`pointerdown` drives
     *   the sticks). Fading on pointer movement meant the pad vanished exactly as
     *   you reached for it — you moved the mouse to click a stick, and the thing
     *   you were aiming at disappeared. It made the fade read as a bug rather
     *   than as a feature, and the demo on this page had to opt out of it
     *   entirely to be usable.
     *
     * A keypress is the honest signal, because it is the one that actually
     * implies the fallback isn't needed.
     */
    _watchRealInput() {
        if (this._inputWatch != null)
            return;
        // NOTE: the watcher installs unconditionally and `fade` is read INSIDE
        // `wake`. It used to be read here, once, which made the attribute inert at
        // runtime in both directions — including from a `scenePanel` toggle, this
        // repo's own recommended way to expose a tweakable. A settings control that
        // silently does nothing is worse than no control.
        const wake = () => {
            if (isOff(this.fade))
                return;
            if (this._idleTimer != null)
                clearTimeout(this._idleTimer);
            this._setFaded(true);
            this._idleTimer = setTimeout(() => this._setFaded(false), Math.max(1, this.idleSeconds) * 1000);
        };
        const onPad = () => {
            const pads = navigator.getGamepads?.() ?? [];
            for (const p of pads) {
                if (p == null)
                    continue;
                if (p.buttons.some((b) => b.pressed) ||
                    p.axes.some((a) => Math.abs(a) > 0.4)) {
                    wake();
                    return;
                }
            }
        };
        window.addEventListener('keydown', wake);
        // The Gamepad API has no "input happened" event, so a physical stick has
        // to be polled — cheaply, and only while we're visible.
        const padPoll = setInterval(onPad, 500);
        this._inputWatch = () => {
            window.removeEventListener('keydown', wake);
            clearInterval(padPoll);
            if (this._idleTimer != null)
                clearTimeout(this._idleTimer);
        };
    }
    /**
     * Is the pad currently hidden by the fade behaviour?
     *
     * Public because the fade is production-correct but development-hostile: once
     * a keyboard is in use the pad goes away and (short of an input
     * drought) doesn't come back, so checking it on a laptop meant reaching for
     * Chrome's responsive mode. `<tosi-b3d>` puts a gamepad gadget in the gear
     * panel that reads and flips this.
     */
    get hidden() {
        return this._faded;
    }
    /**
     * Force the pad visible (`false`) or hand it back to the fade behaviour
     * (`true`). Reconciles immediately — a toggle that waited for the next
     * pointer move would read as broken.
     */
    setFade(on) {
        this.fade = on ? 'on' : 'off';
        if (this._idleTimer != null) {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
        if (!on)
            this._setFaded(false);
    }
    _setFaded(faded) {
        if (faded === this._faded)
            return;
        this._faded = faded;
        this.style.transition = 'opacity 0.4s';
        this.style.opacity = faded ? String(this.fadedOpacity) : '1';
        // Faded controls must not eat clicks meant for the scene behind them.
        this.style.pointerEvents = faded ? 'none' : '';
    }
    _inputWatch = null;
    _idleTimer = null;
    _faded = false;
    async _build() {
        const host = this.parts.clusters;
        const { controls } = parseGamepadControls(String(this.controls ?? ''));
        const scale = this.scale ?? 1;
        const opts = {
            deadzone: this.deadzone,
            maxZone: this.maxZone,
            handleButton: this.handleButton,
        };
        // The set of controls to show (undefined = all). A stick implies its travel.
        let want;
        if (controls != null) {
            want = new Set(controls);
            if (want.has('left_stick'))
                want.add('left_stick_travel');
            if (want.has('right_stick'))
                want.add('right_stick_travel');
        }
        for (const key of ['left', 'right', 'top']) {
            const c = this.clusters?.[key];
            if (c === false)
                continue;
            if (want != null && !CLUSTER_PARTS[key].some((p) => want.has(p)))
                continue;
            const cfg = { ...DEFAULTS[key], ...c };
            let svg;
            try {
                svg = await loadCluster(cfg.url);
            }
            catch (err) {
                console.warn('b3dGamepad: failed to load', cfg.url, err);
                continue;
            }
            if (!this.isConnected)
                return;
            if (want != null) {
                for (const el of Array.from(svg.querySelectorAll('[data-part]'))) {
                    const p = el.getAttribute('data-part');
                    if (p != null && !want.has(p))
                        el.setAttribute('display', 'none');
                }
            }
            svg.setAttribute('style', `position:absolute;${ANCHOR_CSS[cfg.anchor]};` +
                `width:${cfg.vmin * scale}cqmin;height:auto;pointer-events:auto;` +
                `touch-action:none;user-select:none;-webkit-user-select:none`);
            host.appendChild(svg);
            this.sources.push(new TouchGamepadSource(svg, opts));
        }
    }
    poll() {
        let merged = emptyGamepad();
        for (const s of this.sources)
            merged = mergeGamepads(merged, s.poll());
        return merged;
    }
    /** Mirror external gamepad state (hardware/keyboard) onto untouched controls. */
    reflectState(pad) {
        for (const s of this.sources)
            s.reflectState(pad);
    }
    disconnectedCallback() {
        this._inputWatch?.();
        this._inputWatch = null;
        for (const s of this.sources)
            s.dispose();
        this.sources = [];
        super.disconnectedCallback();
    }
}
export const b3dGamepad = B3dGamepad.elementCreator({
    tag: 'tosi-b3d-gamepad',
});
//# sourceMappingURL=glass-gamepad.js.map