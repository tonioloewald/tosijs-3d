import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
import { type LightProgram } from './light-modulation.js';
/**
 * Shared behaviour for a placed light with a body.
 *
 * Subclasses build the light and (optionally) the default fixture; everything
 * else — position, modulation, the envelope clock, shadows, teardown — lives
 * here so a fix lands once rather than three times.
 */
export declare abstract class B3dLamp extends B3dChild {
    static initAttributes: {
        x: number;
        y: number;
        z: number;
        intensity: number;
        diffuse: string;
        specular: string;
        range: number;
        /**
         * `'on'` / `'off'`, not a boolean.
         *
         * A boolean attribute cannot default true — an absent boolean reads false,
         * which is correct HTML and fatal here, since a lamp written
         * `<tosi-b3d-point-light>` would arrive switched off. tosijs now throws at
         * construction on a true-default boolean, so this is not a silent trap any
         * more, but it is still a trap.
         */
        on: string;
        geometry: string;
        geometryScale: number;
        url: string;
        shadows: string;
        timeSource: string;
        /** `0` = auto — resolved against the device tier, like every other budget. */
        shadowTextureSize: number;
    };
    x: number;
    y: number;
    z: number;
    intensity: number;
    diffuse: string;
    specular: string;
    range: number;
    on: string;
    geometry: string;
    geometryScale: number;
    url: string;
    shadows: string;
    timeSource: string;
    shadowTextureSize: number;
    owner: B3d | null;
    light?: BABYLON.Light;
    /** Parent for the fixture. Parent your own geometry here. */
    node?: BABYLON.TransformNode;
    shadowGenerator?: BABYLON.ShadowGenerator;
    /** Undo for the current shadow setup — see `syncShadows`. */
    private _shadowOff;
    /** Fixture materials, repainted each frame to track the light. */
    private _fixtureMats;
    /** Built once, then shown/hidden — see `syncGeometry`. */
    private _fixtureBuilt;
    /**
     * The lamp's whole behaviour as one curve per channel — attack, sustain and
     * decay are regions of it, split by `attackEnd` / `sustainEnd`.
     */
    program: LightProgram | null;
    protected baseIntensity: number;
    protected baseRange: number;
    protected baseColor: BABYLON.Color3;
    private _elapsed;
    /** Last real-time reading, for the `'real'` clock. */
    private _lastRealMs;
    private _switchAt;
    private _wasOn;
    private _tick?;
    private _disposables;
    /** Build the Babylon light. */
    protected abstract createLight(scene: BABYLON.Scene): BABYLON.Light;
    /** Build the default fixture, parented to `node`. */
    protected abstract createGeometry(scene: BABYLON.Scene): BABYLON.Mesh | null;
    protected get isOn(): boolean;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /**
     * Show, hide, or lazily build the fixture to match `geometry`.
     *
     * Called every render, because `geometry` was read once at scene-ready and
     * toggling it did nothing — the THIRD attribute in this component to accept a
     * write and quietly ignore it (`shadows` and the gel were the others). The
     * pattern is worth naming: anything read only in `sceneReady` is a set-once
     * attribute wearing a live attribute's clothes.
     *
     * Hiding rather than disposing, because the fixture is cheap to keep and a
     * rebuild would drop a `url` fixture's loaded meshes and re-fetch them. Built
     * lazily on first show so a lamp that starts `geometry="off"` never pays for
     * geometry it was told not to make.
     */
    private syncGeometry;
    private buildFixture;
    /**
     * An UNLIT emissive material for the fixture.
     *
     * `disableLighting` matters more than it looks: a fixture shaded by the scene
     * is a grey lump precisely when its own light is off, which is when you most
     * need to see where the lamp is.
     */
    protected fixtureMaterial(scene: BABYLON.Scene): BABYLON.StandardMaterial;
    /**
     * Paint the fixture to match the light — colour AND brightness.
     *
     * A flickering lamp with a steadily-glowing bulb is wrong in the way that is
     * hardest to unsee: the thing emitting the light is the one part of the
     * scene not participating in it. Tonio: _"the built-in geometry should mirror
     * the light's brightness etc."_
     *
     * The FLOOR is why this is not simply `colour × brightness`. At zero the
     * fixture is pure black and, being unlit, vanishes completely — and the
     * reason it is unlit in the first place was so you could still see where a
     * switched-off lamp IS. A few percent keeps it locatable in a dark room
     * while reading as off, and is physically defensible anyway: a real bulb
     * still catches the light around it.
     */
    protected paintFixture(color: BABYLON.Color3, brightness: number): void;
    /**
     * Build or tear down the shadow generator to match `shadows`.
     *
     * Called from `render()` as well as at setup, because it was setup-only and
     * that made `shadows` an attribute you could write, that kept your value, and
     * that did nothing — the exact failure #43 describes for the aircraft's chase
     * fields. Toggling it in an editor did nothing at all.
     */
    private syncShadows;
    private setupShadows;
    /** Per-frame: advance the clock and apply the sampled program. */
    private update;
    render(): void;
    /** Keep the Babylon light on the node. Overridden where direction matters. */
    protected positionLight(): void;
    sceneDispose(): void;
    /**
     * Seconds to advance the program by, on whichever clock this lamp uses.
     *
     * Clamped like every other delta here: a tab that was backgrounded for a
     * minute would otherwise hand the program a 60-second step and fast-forward
     * the whole thing on the frame you came back.
     */
    private tickSeconds;
}
export declare class B3dPointLight extends B3dLamp {
    static preferredTagName: string;
    protected createLight(scene: BABYLON.Scene): BABYLON.Light;
    protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh;
}
export declare const b3dPointLight: import("tosijs").ElementCreator<B3dPointLight>;
export declare class B3dSpotLight extends B3dLamp {
    static preferredTagName: string;
    static initAttributes: {
        /** Cone angle in DEGREES — the authoring unit (see CLAUDE.md's Deg rule). */
        angle: number;
        exponent: number;
        /**
         * Inner cone angle in DEGREES — where the edge starts to fade.
         *
         * `0` (default) leaves the cone on Babylon's standard falloff, shaped by
         * `exponent`. Anything above `0` gives a true PENUMBRA: full brightness
         * inside `innerAngle`, fading to nothing at `angle`. Bring them together
         * for a hard-edged theatre spot; spread them for a soft pool.
         *
         * Setting it switches the light to the glTF falloff model, because that is
         * the only one Babylon reads `innerAngle` in — exposing the number without
         * the switch would be an attribute that accepts a write and does nothing,
         * which this component has already shipped once (see `shadows`).
         */
        innerAngle: number;
        /**
         * Cone cross-section: `'circle'` (default), `'square'`, or `'none'`.
         *
         * Babylon's spot is ALWAYS a circular cone — there is no square spot — so
         * a shape is projected as a gel. `'none'` leaves the cone bare.
         *
         * ⚠️ It therefore uses the same slot as `gel`/`gelSvg`. An explicit gel
         * wins and the shape is ignored, because a gel is a picture the author
         * chose and a shape is a default we generated.
         */
        shape: string;
        /**
         * Width / height of the shape. `1` is round or square; `2` is twice as
         * wide as it is tall, which is how you get an ellipse or a letterbox.
         */
        shapeAspect: number;
        /**
         * How soft the shape's edge is, `0..1` as a fraction of its radius.
         *
         * A generated shape needs its own softness because it is a stencil: a hard
         * white square on black gives a hard edge no matter what `exponent` or
         * `innerAngle` say, so the cone's falloff and the gel's would disagree.
         */
        shapeSoftness: number;
        /** Direction the cone points. Default is straight down. */
        dirX: number;
        dirY: number;
        dirZ: number;
        /** Gel (projection texture) URL — bitmap or SVG file. */
        gel: string;
        /** Gel as inline SVG source. Also accepts an `SVGElement` set as a property. */
        gelSvg: string;
        x: number;
        y: number;
        z: number;
        intensity: number;
        diffuse: string;
        specular: string;
        range: number;
        /**
         * `'on'` / `'off'`, not a boolean.
         *
         * A boolean attribute cannot default true — an absent boolean reads false,
         * which is correct HTML and fatal here, since a lamp written
         * `<tosi-b3d-point-light>` would arrive switched off. tosijs now throws at
         * construction on a true-default boolean, so this is not a silent trap any
         * more, but it is still a trap.
         */
        on: string;
        geometry: string;
        geometryScale: number;
        url: string;
        shadows: string;
        timeSource: string;
        /** `0` = auto — resolved against the device tier, like every other budget. */
        shadowTextureSize: number;
    };
    angle: number;
    exponent: number;
    innerAngle: number;
    shape: string;
    shapeAspect: number;
    shapeSoftness: number;
    dirX: number;
    dirY: number;
    dirZ: number;
    gel: string;
    gelSvg: string | SVGSVGElement;
    private _gelTexture?;
    /** Source signature of the current gel — see `syncGel`. */
    private _gelKey;
    protected createLight(scene: BABYLON.Scene): BABYLON.Light;
    /**
     * The gel — Babylon's `projectionTexture`, which only a SpotLight has.
     *
     * An SVG gel goes through `SvgTexture`, so the same vector source that draws a
     * panel can be a window, a leaf canopy or a venetian blind. Rasterized once
     * (`updateInterval: 0`) because a gel is a stencil, not a live surface.
     */
    /**
     * An SVG stencil for the cone's cross-section.
     *
     * White is lit, black is not — a projection texture multiplies the light, so
     * the shape is literally a mask. The soft edge is a Gaussian blur rather than
     * a gradient so the SAME code feathers a square and a circle; a gradient
     * would need a different construction per shape and they would not match.
     *
     * Drawn oversized and blurred INWARD from a margin, because a blur at the
     * viewBox edge clips and leaves a hard line exactly where the softness was
     * supposed to be.
     */
    private shapeGelSvg;
    /**
     * Rebuild the gel only when its SOURCE changed.
     *
     * Called every render, because `shape` / `shapeAspect` / `gel` / `gelSvg` all
     * look like editable attributes and would otherwise be set-once — the exact
     * "accepts a write, keeps the value, does nothing" failure this component
     * already shipped with `shadows`. Keyed on the source string, so a repaint
     * costs a string comparison rather than a texture.
     */
    private syncGel;
    private gelKey;
    private applyGel;
    protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh;
    protected positionLight(): void;
    sceneDispose(): void;
}
export declare const b3dSpotLight: import("tosijs").ElementCreator<B3dSpotLight>;
export declare class B3dAreaLight extends B3dLamp {
    static preferredTagName: string;
    static initAttributes: {
        width: number;
        height: number;
        x: number;
        y: number;
        z: number;
        intensity: number;
        diffuse: string;
        specular: string;
        range: number;
        /**
         * `'on'` / `'off'`, not a boolean.
         *
         * A boolean attribute cannot default true — an absent boolean reads false,
         * which is correct HTML and fatal here, since a lamp written
         * `<tosi-b3d-point-light>` would arrive switched off. tosijs now throws at
         * construction on a true-default boolean, so this is not a silent trap any
         * more, but it is still a trap.
         */
        on: string;
        geometry: string;
        geometryScale: number;
        url: string;
        shadows: string;
        timeSource: string;
        /** `0` = auto — resolved against the device tier, like every other budget. */
        shadowTextureSize: number;
    };
    width: number;
    height: number;
    protected createLight(scene: BABYLON.Scene): BABYLON.Light;
    protected createGeometry(scene: BABYLON.Scene): BABYLON.Mesh;
}
export declare const b3dAreaLight: import("tosijs").ElementCreator<B3dAreaLight>;
//# sourceMappingURL=b3d-lamp.d.ts.map