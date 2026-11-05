import * as BABYLON from '@babylonjs/core';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import type { ControlInput, InputProvider } from './control-input.js';
import type { InputMapping, MappingLabels } from './virtual-gamepad.js';
import { type AgentDriver, type DriverPose } from './agent-driver.js';
export declare class B3dControllable extends AbstractMesh {
    inputProvider: InputProvider | null;
    inputMapping?: InputMapping;
    /**
     * What each control does for this entity (`{ buttonA: 'handbrake', … }`):
     * the glass gamepad names its controls with it for a screen reader.
     */
    inputLabels?: MappingLabels;
    /** Last polled input — read by the XR rig for camera zoom/peek intent. */
    lastInput: ControlInput | null;
    /**
     * An agent's command (see [agents](/b3d-agent/)): while it runs, its input
     * replaces the player's, and the player's own deliberate input cancels it.
     * Made on the first command, so a scene no agent touches carries none.
     */
    agentDriver: AgentDriver | null;
    /** Where this is for the agent driver: world metres (floating origin added back), heading in degrees, speed along the nose. */
    agentPose(): DriverPose | null;
    protected lastUpdate: number;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** The focus manager we announced ourselves to (kept: once we are removed,
     * `closest()` can no longer find it). */
    private _focus;
    sceneDispose(): void;
    applyInput(input: ControlInput, dt: number): void;
    getCameraTarget(): BABYLON.Node | null;
    protected _halted: boolean;
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
    halt(): void;
    /** True once `halt()` has been called. */
    get halted(): boolean;
    /**
     * TRUE world velocity, m/s, or `null` if this entity does not track one.
     *
     * The seam exists because `b3d-death` has to launch a wreck on the velocity
     * it died with, and an entity's own `velocity` field is often only part of
     * the story — `b3d-aircraft`'s reads ZERO in wing-borne flight, because the
     * fly-by-wire path moves the node directly. A wreck given that would drop
     * straight down out of a 60 m/s dive.
     */
    getWorldVelocity(): BABYLON.Vector3 | null;
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
    getChaseAnchor(): BABYLON.TransformNode | null;
    handleGainFocus(): void;
    handleLoseFocus(): void;
    protected _update: () => void;
}
//# sourceMappingURL=b3d-controllable.d.ts.map