import * as BABYLON from '@babylonjs/core';
import { XRStuff } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import type { GameController } from './game-controller.js';
import { B3dControllable } from './b3d-controllable.js';
import type { ControlInput } from './control-input.js';
export type AnimStateSpec = {
    animation: string;
    name?: string;
    loop?: boolean;
    additive?: boolean;
    backwards?: boolean;
};
export declare class AnimState {
    animation: string;
    name: string;
    loop: boolean;
    additive: boolean;
    backwards: boolean;
    constructor(spec: AnimStateSpec);
    static buildList(...specs: AnimStateSpec[]): AnimState[];
}
/**
 * **Animation states for a Quaternius UAL rig** (the Universal Animation
 * Library, on `cdn.tosijs.net/quaternius/`).
 *
 * The biped drives states by NAME — `walk`, `run`, `sneak` — and a rig supplies
 * whatever its animator called them. This is the translation for UAL, so
 * adopting that library is one line:
 *
 * ```js
 * b3dBiped({
 *   url: assetUrl('quaternius/UAL1_core.glb'),
 *   animationStates: ualAnimationStates(),
 * })
 * ```
 *
 * Two things it buys beyond names. `walkBackwards` becomes a real
 * `Jog_Bwd_Loop` rather than the walk cycle played in reverse, and `sneak` gets
 * a crouch that holds at rest — both were fakes against the stock rig.
 *
 * Pass `extra` to add or override entries; a later entry with the same `name`
 * wins, so a project can retarget one state without restating the rest.
 */
export declare function ualAnimationStates(extra?: AnimStateSpec[]): AnimState[];
export declare class B3dBiped extends B3dControllable {
    static preferredTagName: string;
    static initAttributes: {
        url: string;
        skin: string;
        scale: number;
        player: boolean;
        cameraType: string;
        animation: string;
        animationSpeed: number;
        initialState: string;
        turnSpeed: number;
        forwardSpeed: number;
        runSpeed: number;
        backwardSpeed: number;
        cameraHeightOffset: number;
        cameraTargetHeight: number;
        cameraMinFollowDistance: number;
        cameraMaxFollowDistance: number;
        groundY: number;
        eyeHeight: number;
        /** Degrees per second the right stick swings the view. */
        lookRate: number;
        /** How far up/down the look can go, degrees. */
        maxLookPitch: number;
        /**
         * Invert the right stick's vertical. **On by default** — Tonio's call, and
         * the conventional one for a third-person camera: pushing the stick away
         * from you tips the view DOWN, the way a physical camera head works. Set
         * `'off'` for the direct mapping.
         *
         * A string enum rather than a boolean because an absent boolean attribute
         * is false, so a default-true boolean can never turn on (and tosijs now
         * throws on one) — see CLAUDE.md.
         */
        invertLookY: "on" | "off";
        /**
         * Never let the follow camera drop below this above the character's feet.
         * Pitch drives the camera's HEIGHT, so looking up walks it downward — and
         * without a floor it ends up underground, which reads as the world
         * vanishing. Metres.
         */
        cameraMinHeight: number;
        /**
         * Upward speed of a FULLY wound-up jump, m/s. The physics is fixed and the
         * ANIMATION is retimed to match it — not the other way round. Matching the
         * jump to the clip was tried and was wrong: it made the jump a consequence
         * of whatever the animator exported.
         */
        jumpSpeed: number;
        /** Fraction of walking speed while sneaking. */
        sneakSpeed: number;
        /** Sidestep speed as a fraction of walking. Slower than forward on purpose. */
        strafeSpeed: number;
        /**
         * `'on'` to sidestep with the left stick, `'off'` (default) to turn with it
         * instead — both sticks then steer and the sidestep clips never play.
         *
         * Off by default on principle rather than as a workaround: strafing is a
         * shooter idiom that reads oddly on a character meant to move like a
         * person. That it also avoids the weakest clips in the Quaternius set is a
         * bonus, not the reason.
         *
         * A string enum rather than a boolean because a boolean attribute cannot
         * default to true, and the useful default here is "strafing off".
         */
        /**
         * **How deep the water gets before you swim, as a fraction of standing
         * height.** Below this you wade — feet on the bottom, walking; above it
         * buoyancy takes over.
         *
         * `0.45` is about 0.8 m on a 1.83 m rig. Tonio set the band: *"make it
         * about 0.4-0.5 (it's hard to swim in water less than waist deep)"* — which
         * is the real constraint. Swimming shallower than that is not a choice a
         * person gets to make; the bottom is in the way.
         *
         * A fraction rather than metres because it is a fact about the BODY — a
         * smaller character should start swimming sooner in the same pond, and a
         * fraction tracks that for free. Metres would be right for a fact about the
         * WORLD; the two are easy to confuse and worth keeping apart.
         *
         * Leaving the water uses a lower threshold (70% of this) so the boundary
         * does not flicker; see `buoyancy.isSwimming`.
         */
        /**
         * **How high a ledge the character can pull itself onto, metres.** Below
         * `STEP_UP` (0.5) the walking code just steps up; above this it is a wall.
         *
         * `2.2` is a touch over shoulder height on a 1.83 m rig — a decent mantle
         * for someone athletic. Lower it for a heavier or clumsier character; that
         * is the mobility half of the skill dial AI-DESIGN argues for, and it costs
         * nothing to expose because the band it defines is read from geometry
         * rather than painted onto it.
         */
        climbReach: number;
        wadeDepth: number;
        strafing: string;
        /**
         * **How high this figure rides in the water, in METRES.** `0` (default)
         * puts the waterline at the head — what swimming means — and it is a
         * straight vertical offset from there: `0.1` floats ten centimetres
         * higher, `-0.1` ten lower.
         *
         * Metres rather than a dimensionless multiplier because a multiplier is not
         * authorable — its effect depends on how tall the pose happens to be, so
         * the same number means different things for a tread and a crawl, and you
         * tune it by bisection. An offset is the thing you actually want to say:
         * *this figure sits a bit lower in the water.* Tonio: *"we can keep
         * buoyancy as a strict z offset for a given figure in water."*
         *
         * It is per-FIGURE, which is the useful axis — a heavy pack, armour, a
         * different body — and it composes with any animation set, because the
         * anchor it offsets from is measured rather than authored.
         */
        buoyancy: number;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    entries?: BABYLON.InstantiatedEntries;
    camera?: BABYLON.Camera;
    /** Camera mode, toggled by the view button: third-person over-the-shoulder
     * ('chase') or first-person ('fpv', at the head with the body hidden — keep
     * first-person parts via a `_fpv` mesh name). Read by the XR rig too. */
    cameraView: 'chase' | 'fpv';
    private fpvCamera;
    private headNode;
    private viewWasPressed;
    private hiddenBody;
    /** XR/chase camera params, computed from the model bounds in render(). The
     * chase rig interpolates height (eyeHeight→chaseHeight) and distance with the
     * zoom intent, so zooming in drops to head height and out pulls back/up. */
    chaseHeight: number;
    chaseDistance: number;
    private _eyePos;
    /** Eye position for first-person: the head bone (or eyeHeight fallback) nudged
     * up + forward to roughly the eyes, so the camera sits at the eyes rather than
     * the neck / head-bone base — which would leave the head & neck in front of the
     * view. Forward is body-facing (root-aligned), since the camera ignores the
     * head's own animation. Returns a cached vector — read it now, don't retain. */
    getHeadPosition(): BABYLON.Vector3 | null;
    xrStuff?: XRStuff;
    private xrInputProvider?;
    animationState?: AnimState;
    animationGroup?: BABYLON.AnimationGroup;
    /** Measured vertical extent of the body per animation clip. See `_poseExtent`. */
    private _poseCache;
    /** Seconds the current clip has been playing — a pose needs settling before measuring. */
    private _poseAge;
    /**
     * The climb in progress, if any — a COMMITTED transition. Time-boxed by the
     * clip and always exited, so it is not a mode you can be stuck in (the
     * distinction MOBILITY-DESIGN draws about cover applies here too).
     */
    /** Seconds until the ledge probe may run again — see the note at `_tryMantle`. */
    private _ledgeCooldown;
    private _mantle;
    /** Samples in flight for the clip being measured — see `_currentPose`. */
    private _poseAccum;
    /** Last measured pose that hangs below its root, i.e. a swim pose. See the note in water. */
    private _lastSwimPose;
    gameController?: GameController;
    /**
     * Downward speed while airborne, m/s. One value per element rather than per
     * root node: a character GLB has a single root, and sharing it across two
     * would only matter for a rig that does not exist.
     */
    private _fallVel;
    /** True while in the water and off the bottom — see `buoyancy.isSwimming`. */
    private _swimming;
    /** Held aim while swimming, DEGREES, positive down — see [[swim-aim]]. */
    private _swimAim;
    /** The pitch actually applied to the body, eased toward `_swimAim`. */
    private _swimPitch;
    /** Whether the body carried a pitch last frame, so unwinding runs to zero. */
    private _swimWasPitched;
    /** Body yaw in radians while pitched — integrated, never read back. */
    private _bodyYaw;
    /**
     * Camera/body pitch in degrees, positive up. There is no `_lookYaw`: the
     * right stick turns the BODY now, so the camera has no yaw of its own.
     */
    private _lookPitch;
    private _sneaking;
    /** Held the jump button while grounded: winding up, not yet launched. */
    private _jumpWasDown;
    /** Off the ground and not in water — the jump clip owns the animation. */
    private _inAir;
    private _jumpClip;
    /**
     * Which phase of the three-part jump is showing. `Jump_Start` is a takeoff,
     * `Jump_Loop` holds you in the air however long the arc lasts, `Jump_Land`
     * plays on touchdown — so the clips no longer have to be stretched to fit the
     * flight, which is what `speedRatio` retiming was compensating for.
     */
    private _airPhase;
    private _phaseLeft;
    /**
     * How long an animation clip runs, in seconds — `0` if there is no such clip.
     *
     * `from`/`to` are FRAMES, so this needs the clip's own frame rate rather than
     * an assumed 60: a 24 fps export would otherwise read as two and a half times
     * too long and launch the character accordingly. `speedRatio` counts too,
     * since the biped scales playback by movement speed.
     */
    private _clipSeconds;
    private _sneakWas;
    /** Zoom 0..1, now integrated from the d-pad rather than read off a stick. */
    private _camZoom;
    private _waterEl;
    /**
     * Surface height of the scene's water, or `null` if there is none.
     *
     * Looked up lazily and cached — `undefined` means "not asked yet", `null`
     * means "asked, no water", which is the common case and must cost nothing per
     * frame. Read from the MESH rather than the element's `y`: water is
     * viewer-centred and not origin-shifted, so the mesh is the honest answer.
     */
    private _waterSurfaceY;
    private xrCamZoom;
    animationStates: AnimState[];
    /**
     * **How tall the body actually is, in the pose it is holding right now.**
     *
     * Returns the body's vertical extent relative to the root node — `bottom` is
     * how far BELOW the root the lowest point is, `height` the full span — or
     * `null` until a skinned mesh is available.
     *
     * This exists because the root node is only at the feet when the character is
     * STANDING. Measured on the Quaternius rig: `Idle_Loop` spans 0 → 1.78 above
     * the root, but `Swim_Idle_Loop` hangs the legs 1.37 m BELOW it and puts the
     * head just 0.24 m above. Treating the root as the feet therefore floated a
     * body that was not there and left the real head about 1.2 m under —
     * Tonio: *"the biped is much lower when treading water relative to the old
     * biped"*, which is exactly right and now measured rather than guessed.
     *
     * It also killed the `buoyancy` dial: getting that head out of the water
     * needed a submersion of 0.14, i.e. `buoyancy ≈ 7`, so raising it to 2 moved
     * the body and changed nothing anyone could see.
     *
     * **Measured, never authored.** A per-rig table of swim offsets would be the
     * obvious alternative and is the wrong shape — it is `_cover` painting by
     * another name (MOBILITY-DESIGN.md): a fact the geometry already knows, wired
     * by hand, silently wrong for the next animation set. Since the numbers here
     * come out of the pose itself, a Mixamo or Mocap rig with different
     * proportions floats correctly with no tuning.
     *
     * Cost is one CPU skinning pass per CLIP, cached forever after — not per
     * frame. `refreshBoundingInfo({applySkeleton:true})` is far too expensive to
     * run continuously.
     */
    private _poseExtent;
    /**
     * Height of the head bone above the root in the current pose, or `null` on a
     * rig with no findable head. See `_swimWaterline` for what it is for.
     */
    private _headOffset;
    /**
     * The extent for the clip currently playing, **averaged over a couple of
     * seconds** rather than sampled once, and cached per clip.
     *
     * Averaging is not polish, it is the difference between working and not. A
     * swim cycle is not a fixed shape: measured on `Swim_Fwd_Loop` (1.33 s), the
     * body's lowest point swings from −1.26 to −0.28 as the legs kick — nearly a
     * metre — and the head from −0.03 to +0.28. A single sample therefore lands
     * wherever the settle timer happens to fall, and since the waterline is
     * derived from `height / depth`, the shallow end of that swing produced a
     * buoyancy at the clamp and fired the swimmer out of the water. Tonio: *"I
     * seem to porpoise out of the water with a dead right stick"* — intermittent,
     * because it depended on the phase, which is exactly how it read.
     *
     * Returns the running mean while it accumulates, so the value is usable
     * immediately and merely gets better; it is committed to the cache once the
     * window closes.
     */
    private _currentPose;
    /**
     * **Where the water should sit on this pose**, expressed as the buoyancy that
     * puts it there — a body rests at submersion `1 / buoyancy`, so the two are
     * the same statement.
     *
     * The anchor is the **head**, because that is what swimming IS: a swimmer
     * keeps their head at the surface, and does it by swimming rather than by
     * floating. That makes this a fact about the activity rather than about a
     * clip, so it holds for any humanoid rig — the head bone exists in all of
     * them — and needs no per-animation-set tuning.
     *
     * It also beats the two conventions it sits between, both of which we tried.
     * The root is not a reliable anchor because it means different things in
     * different clips (Tonio: *"the whole root means two completely different
     * things ... is quite problematic"*) — feet when standing, roughly waterline
     * when swimming. Taking it literally floated this rig at ARMPIT height, since
     * its root sits 73% up the treading pose: *"he's still floating way too
     * high."* Anchoring at the head instead puts the water at the neck with the
     * chin clear, which is what treading water looks like, and the same rule
     * leaves a front crawl's head breaking the surface.
     *
     * Falls back to the root convention on a rig with no head bone, and to a
     * plain physical ratio for a pose that does not hang below its root (i.e. a
     * standing one, where there is no waterline being declared at all).
     *
     * Clamped, because `height / depth` diverges as the depth approaches zero and
     * one mid-blend measurement would otherwise fire a swimmer out of the water.
     */
    private _swimWaterline;
    /**
     * **Look for a lip in front of the character.** Two rays: one forward at shin
     * height to find the face of the thing, one down from above the far side to
     * find what you would be standing on.
     *
     * Returns `null` when there is nothing to read. Everything it does return is
     * a MEASUREMENT — see `mantle.canMantle` for the decision, which is pure and
     * tested, and see MOBILITY-DESIGN for why a `_climbable` suffix would be a
     * bug rather than a shortcut.
     */
    private _readLedge;
    /**
     * Try to start a climb. Returns true if one began, in which case the caller
     * hands this frame over — a mantle owns the body until it finishes.
     */
    private _tryMantle;
    setAnimationState(name: string, speed?: number): void;
    getCameraTarget(): BABYLON.Node | null;
    applyInput(input: ControlInput, dt: number): void;
    private setupXRInput;
    setupXRCamera(): Promise<void>;
    setupFollowCamera(): Promise<void>;
    /** Toggle third-person ('chase') vs first-person ('fpv'). In VR the rig reads
     * cameraView; on flat we switch the active camera. Either way the body is
     * hidden in first-person so it isn't in your face (and can't run ahead of the
     * camera) — while still casting its shadow. */
    setCameraView(view: 'chase' | 'fpv'): void;
    /** Hide the WHOLE biped in first-person (robust regardless of head-mesh names,
     * and it kills the body-running-ahead artefact), EXCEPT meshes whose name
     * contains `_fpv` — mark first-person hands/arms/tools that way to keep them.
     * Shadow casting is unaffected: Babylon's shadow generator renders its caster
     * list regardless of `isVisible`, so you still cast a full-body shadow. */
    private setBodyHidden;
    connectedCallback(): void;
    /** Swap the model's `skin` material albedo texture (Kenney characters are
     * textureless + reskinned by this PNG). Empty clears it. Matches materials named
     * ~`skin`, or all PBR materials if none is. */
    applySkin(url: string): void;
    private _equipped;
    /**
     * Load an accessory GLB and attach it to a named rig bone (`Head`, `RightHand`,
     * `Hips`, …), replacing anything already on that bone. Kenney accessories are
     * origin-authored (their geometry sits at the origin, meant to be positioned BY
     * the bone), so parenting to the bone's node places + animates them correctly.
     */
    equip(boneName: string, url: string): void;
    /** Remove whatever is equipped on a bone. */
    unequip(boneName: string): void;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
}
export declare const b3dBiped: import("tosijs").ElementCreator<B3dBiped>;
//# sourceMappingURL=b3d-biped.d.ts.map