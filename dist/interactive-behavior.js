/*#
# interactive-behavior

The **attachable** interactive — the scene-side bridge over the pure rules in
[interaction](?interaction.ts). It watches the scene's pointer, decides whether
this thing was hovered or used, and tells its host. `b3d-interactive` is a thin
element wrapper around it; attach one directly to a loader, a biped, a vehicle
or anything else that already owns a mesh.

## One implementation, flat and immersive

Babylon routes **XR controller rays through `scene.onPointerObservable`** — the
same observable a mouse feeds. So there is no XR branch here and no second code
path to keep in step: a mouse click on a canvas and a trigger pull in a headset
arrive identically, and a thing that is usable flat is usable in VR.

## It never touches the transform

An element that manages a node **owns** its transform: `AbstractMesh` rewrites
`mesh.position` and `mesh.rotationQuaternion` from its own attributes on every
render, so a behaviour that moves the *mesh* is silently undone on the next
frame. That cost a whole bug (#35), and it is a contract here rather than a note
in a doc: **this behaviour reads the scene and never writes to it.** A door that
opens moves its *element* (`ry`, `x`, …) — the thing that owns the transform.

The one visual it does own is the hover outline, which is material state, not
placement.

## Composition, not a god-feature

Other features answer "not while I say so" through `vetoes`. A `lockable` adds
one; `interactive` never learns what a lock is. Vetoes are consulted at
**activation**, not at hover — a locked door still highlights and still reports
being tried, because "it did not budge" is feedback and silence is a bug report.
A refusal names the refuser, so a caller can tell a locked door from a broken one.
*/
/*{ "parent": "World Sim", "order": 900 }*/
import * as BABYLON from '@babylonjs/core';
// `mesh.renderOutline` does not EXIST until this side-effect module patches it
// onto the prototype — assigning it without the import silently does nothing,
// which is precisely how the hover highlight shipped inert the first time and
// was caught only by reading the property back off a live mesh (`undefined`,
// not `false`). Tree-shaking makes an unimported Babylon feature look like a
// missing one.
import '@babylonjs/core/Rendering/outlineRenderer';
import { interactStep, newInteractState, activationVeto, } from './interaction';
/** Every attached, live interactive in a scene — the pool `useNearest` picks from. */
const registry = new WeakMap();
const sceneSet = (scene) => {
    let set = registry.get(scene);
    if (!set) {
        set = new Set();
        registry.set(scene, set);
    }
    return set;
};
export class InteractiveBehavior {
    owner;
    host;
    config;
    /** Other features' "not while I say so" — consulted at activation only. */
    vetoes = [];
    whenActivated;
    whenHovered;
    whenUnhovered;
    whenRefused;
    _state = newInteractState();
    _down = false;
    _obs;
    _outlined = [];
    _last = { mesh: null, point: null, distance: 0 };
    constructor(owner, host, config) {
        this.owner = owner;
        this.host = host;
        this.config = config;
    }
    attach() {
        const scene = this.owner.scene;
        // Without this, a POINTERMOVE arrives with no pickInfo and nothing ever hovers.
        scene.constantlyUpdateMeshUnderPointer = true;
        this._obs =
            scene.onPointerObservable.add((info) => this._onPointer(info)) ??
                undefined;
        sceneSet(scene).add(this);
    }
    dispose() {
        const scene = this.owner.scene;
        if (this._obs) {
            scene.onPointerObservable.remove(this._obs);
            this._obs = undefined;
        }
        sceneSet(scene).delete(this);
        this._clearOutline();
        this._state = newInteractState();
    }
    /** Is the pointer on it right now? */
    get hovered() {
        return this._state.phase !== 'idle';
    }
    /** True when nothing refuses an activation — i.e. it would actually work. */
    get operable() {
        return this._enabled() && activationVeto(this.vetoes) == null;
    }
    /**
     * Use it without pointing at it — a keyboard `interact`, an NPC, a test.
     *
     * Runs the SAME veto pass as a pointer activation, so a locked door is locked
     * however you reach it. Returns `true` if it fired.
     */
    activate(info) {
        if (!this._enabled())
            return false;
        return this._fire({ ...this._last, ...info });
    }
    /** Tuned state for the console / `hj eval` / a Perf-panel debug source. */
    get debugState() {
        return {
            enabled: this._enabled(),
            phase: this._state.phase,
            armed: this._state.armed,
            meshes: this.config.meshes().map((m) => m.name),
            reach: this.config.reach?.() ?? 0,
            vetoes: this.vetoes.map((v) => `${v.name}:${v.blocks() ? 'blocks' : 'ok'}`),
        };
    }
    /** World centre of the target meshes — what `useNearest` measures against. */
    center() {
        const meshes = this.config.meshes();
        if (meshes.length === 0)
            return null;
        const sum = new BABYLON.Vector3(0, 0, 0);
        for (const m of meshes)
            sum.addInPlace(m.getAbsolutePosition());
        return sum.scaleInPlace(1 / meshes.length);
    }
    /** Max usable distance, or `Infinity` when unlimited. */
    get reach() {
        const r = this.config.reach?.() ?? 0;
        return r > 0 ? r : Infinity;
    }
    _enabled() {
        return this.config.enabled?.() ?? true;
    }
    _onPointer(pointerInfo) {
        const { POINTERDOWN, POINTERUP, POINTERMOVE } = BABYLON.PointerEventTypes;
        const type = pointerInfo.type;
        if (type === POINTERDOWN)
            this._down = true;
        else if (type === POINTERUP)
            this._down = false;
        else if (type !== POINTERMOVE)
            return;
        const pick = pointerInfo.pickInfo;
        const picked = pick?.hit ? pick.pickedMesh : null;
        const mine = picked != null && this.config.meshes().includes(picked);
        const distance = pick?.distance ?? 0;
        const reach = this.config.reach?.() ?? 0;
        const result = interactStep(this._state, {
            over: mine,
            down: this._down,
            // Reach is part of the rule: a knob across the room is not operable just
            // because the ray reached it.
            withinReach: reach <= 0 || distance <= reach,
            enabled: this._enabled(),
        });
        this._state = result.state;
        if (mine) {
            this._last = {
                mesh: picked,
                point: pick?.pickedPoint ?? null,
                distance,
            };
        }
        if (result.entered) {
            this._applyOutline();
            this._emit('hover', this._last, this.whenHovered);
        }
        if (result.exited) {
            this._clearOutline();
            this._emit('unhover', this._last, this.whenUnhovered);
        }
        if (result.activated)
            this._fire(this._last);
    }
    /** The one place an activation is decided — pointer and `activate()` share it. */
    _fire(info) {
        const reason = activationVeto(this.vetoes);
        if (reason != null) {
            this._emit('refused', { ...info, reason }, this.whenRefused);
            return false;
        }
        this._emit('activate', info, this.whenActivated);
        return true;
    }
    _emit(name, detail, callback) {
        callback?.(detail);
        this.host.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }
    _applyOutline() {
        const color = this.config.highlight?.() ?? '';
        if (!color || color === 'none')
            return;
        const c = BABYLON.Color3.FromHexString(color);
        this._outlined = this.config.meshes();
        for (const m of this._outlined) {
            const mesh = m;
            mesh.renderOutline = true;
            mesh.outlineColor = c;
            mesh.outlineWidth = 0.02;
        }
    }
    _clearOutline() {
        for (const m of this._outlined)
            m.renderOutline = false;
        this._outlined = [];
    }
}
/**
 * The nearest usable thing, for a "walk up and press E" control.
 *
 * Pointing at something is the ray interaction; this is the other one — the
 * `interact` button every controller already has (see `ControlInput`). It
 * considers only interactives that are enabled and inside their own reach of
 * `from`, and returns the closest, or `null` when nothing is in range.
 *
 * It deliberately does NOT consult vetoes: a locked door is still the thing you
 * are standing at, and activating it is how you learn it is locked.
 */
export function nearestInteractive(scene, from) {
    let best = null;
    let bestDist = Infinity;
    for (const it of sceneSet(scene)) {
        const center = it.center();
        if (center == null)
            continue;
        const d = BABYLON.Vector3.Distance(center, from);
        if (d > it.reach || d >= bestDist)
            continue;
        best = it;
        bestDist = d;
    }
    return best;
}
/**
 * Activate the nearest usable thing. Returns `true` if something fired.
 *
 * Wire it to `input.interact` and a scene full of doors becomes operable
 * without a single per-door key handler.
 */
export function useNearest(scene, from) {
    return nearestInteractive(scene, from)?.activate() ?? false;
}
//# sourceMappingURL=interactive-behavior.js.map