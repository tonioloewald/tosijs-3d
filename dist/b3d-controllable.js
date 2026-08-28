/*#
# b3d-controllable

Base class for any entity that can be driven by a `ControlInput` — bipeds, cars,
helicopters, boats, etc.

Subclasses override `applyInput(input, dt)` with their specific movement model.
The base class handles the update loop: poll input → apply input.

## Example

The base class is abstract — you subclass it. A minimal one that yaws to the throttle
(real subclasses — [b3d-biped](?b3d-biped.ts), [b3d-car](?b3d-car.ts),
[b3d-aircraft](?b3d-aircraft.ts) — put a full movement model here):

```javascript
import { B3dControllable } from 'tosijs-3d'

class Spinner extends B3dControllable {
  applyInput(input, dt) {
    // input is a ControlInput; act on the fields this entity cares about
    if (this.meshNode) this.meshNode.rotation.y += input.throttle * dt * 3
  }
}
```

## Key Methods

- `applyInput(input, dt)` — override with movement/animation logic
- `getCameraTarget()` — returns the node cameras should follow
- `handleGainFocus()` / `handleLoseFocus()` — lifecycle hooks for input switching
*/
/*{ "parent": "Input", "order": 900 }*/
import { AbstractMesh, simHalted, controlsLive, } from './b3d-utils';
import { emptyInput } from './control-input';
export class B3dControllable extends AbstractMesh {
    inputProvider = null;
    inputMapping;
    /** Last polled input — read by the XR rig for camera zoom/peek intent. */
    lastInput = null;
    lastUpdate = 0;
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        // PULL, don't push. A controllable added mid-game (a RESPAWNED aircraft) announces
        // itself to the focus manager once IT is ready — rather than the manager guessing when
        // to look, or watching the subtree.
        //
        // This is not a style preference: the manager scans for `player: true` at ITS setup,
        // and a caller who appends an entity and immediately asks the manager to re-scan will
        // find `player` still false — tosijs drains attributes on connectedCallback, so the
        // flag isn't there yet at the moment of appendChild. (B3d abandoned MutationObserver
        // discovery for exactly this race; see CLAUDE.md.) By sceneReady the attributes are
        // drained, so this is the moment when the question can be answered truthfully.
        //
        // The manager only takes us if it's driving NOBODY — so this never steals the camera
        // from a live player; it only fills a vacancy, which is precisely the respawn case.
        const focus = this.closest('tosi-b3d-input-focus');
        focus?.adoptIfVacant?.(this);
    }
    sceneDispose() {
        this.inputProvider = null;
        super.sceneDispose();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyInput(input, dt) {
        // Subclasses override this with their movement model
    }
    getCameraTarget() {
        return this.mesh ?? null;
    }
    _halted = false;
    /**
     * **Stop simulating. You are a corpse.** Idempotent.
     *
     * **Belt and braces, honestly labelled.** A focus-managed entity already
     * stops when it dies, but only INCIDENTALLY: `releaseFocus()` sets
     * `inputProvider = null` and `_update` happens to short-circuit on that. I
     * went looking for a coasting corpse behind a real bug report and measured
     * one that does not move (0.05 m in 10 s) — the report turned out to be the
     * XR rig teleporting to the origin, not the wreck flying away.
     *
     * It stays because the incidental version does not cover everything: `die()`
     * can be handed an entity the focus manager never held — a scripted death, an
     * AI, a test — and nothing would stop that one at all. "You are dead" should
     * be something the entity is TOLD, not a side effect of a null field.
     *
     * Halting here rather than in each subclass because `_update` is the single
     * entry point every controllable's motion goes through.
     */
    halt() {
        this._halted = true;
    }
    /** True once `halt()` has been called. */
    get halted() {
        return this._halted;
    }
    /**
     * TRUE world velocity, m/s, or `null` if this entity does not track one.
     *
     * The seam exists because `b3d-death` has to launch a wreck on the velocity
     * it died with, and an entity's own `velocity` field is often only part of
     * the story — `b3d-aircraft`'s reads ZERO in wing-borne flight, because the
     * fly-by-wire path moves the node directly. A wreck given that would drop
     * straight down out of a 60 m/s dive.
     */
    getWorldVelocity() {
        return null;
    }
    /**
     * A node carrying this entity's POSITION and HEADING, held level — what a
     * chase camera should be a child of.
     *
     * It exists so a chase rig can be **parented** rather than recomputed. The XR
     * rig runs in `onXRFrameObservable`, which fires BEFORE `scene.render()`,
     * while an entity moves in `registerBeforeRender`, which fires inside it — so
     * anything that copies a position is copying LAST frame's, every frame, and a
     * variable frame time turns that fixed lag into jitter. A child's world matrix
     * is resolved at render time, after the entity moved, so the order stops
     * mattering. (Measured 2026-08-26; see TODO → "THE CHASE RIG".)
     *
     * Level and yaw-only on purpose: parenting straight to the airframe would hand
     * the camera the attitude, which is a rolling horizon in a headset.
     *
     * `null` (the default) means "no anchor" and a caller must fall back.
     */
    getChaseAnchor() {
        return null;
    }
    handleGainFocus() {
        this.inputProvider?.activate?.();
    }
    handleLoseFocus() {
        this.inputProvider?.deactivate?.();
    }
    _update = () => {
        const now = Date.now();
        const dt = Math.min((now - this.lastUpdate) * 0.001, 0.1);
        this.lastUpdate = now;
        /*
        HALT, don't just zero the stick.
    
        This clock is `Date.now`-based, not `sceneDelta`, so a paused scene does not
        slow it down. Feeding the flight model empty input was not a pause: with no
        input an aircraft COASTS, which is indistinguishable from cruising. The
        player's report was "I can background the tab, come back and the game is
        continuing to run, I just can't steer" (#30). `lastUpdate` is stamped above,
        so resuming does not deliver the whole pause as one step.
        */
        if (simHalted(this.owner))
            return;
        // Dead. Not merely unsteered — see `halt()`.
        if (this._halted)
            return;
        if (this.inputProvider == null)
            return;
        // Scene input focus: when a page hosts multiple demos, only the active (last
        // hovered/clicked) scene consumes the shared keyboard/gamepad — an unfocused
        // scene sees neutral input so it idles instead of being driven in the background.
        // A PAUSED scene must not read input either: the render loop still runs (the
        // pause panel has to be drawn), so without this a held stick would keep
        // steering a world that is supposed to be stopped.
        /*
        `inputSuppressed` is a MODAL gate: a prompt that asks you to pull a trigger
        must not also fire the gun with it (the re-seat dialog). Unlike `frozen` it
        does NOT stop the world — an unfocused demo on a busy page should idle, not
        freeze — which is why the two predicates are separate. See `b3d-utils`.
        */
        const live = controlsLive(this.owner);
        const input = live ? this.inputProvider.poll(dt) : emptyInput();
        this.lastInput = input;
        this.applyInput(input, dt);
    };
}
//# sourceMappingURL=b3d-controllable.js.map