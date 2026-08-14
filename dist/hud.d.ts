import { type Side } from './hud-math';
import type { Vec3 } from './spatial-transform';
export type { Side } from './hud-math';
export type MeterName = 'speed' | 'altitude' | 'health' | 'energy';
export type TraceKind = 'neutral' | 'friendly' | 'hostile' | 'waypoint';
export type HudTraceInput = {
    pos: Vec3;
    kind: TraceKind;
    /** Radar's lock acquisition on this contact, 0..1 — the trace fills with white as it
     * builds (nothing → 50%), so the pilot can see a lock coming, and drains back if the
     * contact slips the cone. */
    lockProgress?: number;
    /** Radar HAS a lock — the trace's OUTLINE goes white and its fill takes over the
     * FACTION colour (the channels trade jobs, so it still says what it is). A categorical
     * change, not more fill. Stays bold even when pinned off-glass. */
    locked?: boolean;
};
/**
 * A trace ALREADY placed in HUD viewBox coordinates (0..VIEWBOX, +y down) by whoever
 * owns the HUD's geometry. We deliberately do NOT re-derive a projection here: the HUD
 * is a real quad in the world (the cockpit combiner), so `b3d-hud` places each contact
 * by intersecting the eye→target ray with that quad — which cannot disagree with what
 * the renderer draws. `tracked` = it fell ON the glass; false = pinned to the ring.
 */
export type HudTracePoint = {
    x: number;
    y: number;
    kind: TraceKind;
    /** Radar's lock acquisition, 0..1 — drives how solidly the trace fills in (the
     * outline going white is the separate, categorical "locked" cue). */
    lockProgress?: number;
    locked?: boolean;
    tracked: boolean;
};
/** A warning line; give it a `side` to also flash that arc frame red. */
export type HudWarning = {
    text: string;
    side?: Side;
};
export type HudController = {
    /** The live SVG element (mount it, or feed it to an SvgTexture). */
    readonly el: SVGSVGElement;
    /** Fill a meter arc, `level` 0..1. */
    setMeter(name: MeterName, level: number): void;
    /** Drive the horizon: pitch/roll in degrees, optional centre AoA number. */
    setHorizon(pitchDeg: number, rollDeg: number, angle?: number): void;
    /** Replace the radar traces. Points are ALREADY in HUD viewBox coords — whoever
     * owns the HUD's geometry (b3d-hud) projects them, because only it knows where the
     * HUD actually is. See `HudTracePoint`. */
    setTraces(points: HudTracePoint[]): void;
    /** Show warning lines (the `#warning` text) and flash any threat-side arc red. */
    setWarnings(warnings: HudWarning[]): void;
    /**
     * Show or hide the artificial horizon + pitch ladder.
     *
     * It's the one element that LIES outside the cockpit: from a chase camera
     * the view isn't on the aircraft's attitude, so a horizon drawn level with
     * the airframe contradicts the horizon you can see out the window. The
     * meters, radar traces and warnings are all still true from any viewpoint,
     * so they stay.
     */
    setHorizonVisible(visible: boolean): void;
    /**
     * REFERENCE MARKS on a meter — a notch at a level, drawn on the meter's own
     * arc so it can't drift out of alignment with the fill.
     *
     * What a bare fill can't say: with a throttle LEVER your speed is heading
     * TOWARD an equilibrium rather than sitting at one, and a needle with no
     * target looks like it's misbehaving (Tonio watched speed climb after
     * releasing the trigger and read it as a fault). A notch answers "where is
     * this going?" Same trick serves the altimeter: sea level when you're below
     * it, and the ground beneath you when that's higher.
     *
     * Levels are in the same 0..1 space as `setMeter`. Pass `[]` to clear.
     */
    setMeterMarks(name: MeterName, levels: number[]): void;
};
/** HUD viewBox is 256×256; CENTER is its middle. Exported so whoever projects onto
 * the HUD (b3d-hud) can map its quad's local (u,v) into these coords. */
export declare const HUD_VIEWBOX = 256;
export declare const HUD_CENTER: number;
/** Radius the ring sits at, and where out-of-glass contacts pin. */
export declare const HUD_RING_RADIUS = 84;
export declare const HUD_PIN_RADIUS = 116;
export type HudControllerOptions = {
    /**
     * Pixels per degree of pitch. Also the copy spacing: the three ladder copies are
     * 10° apart, so they sit `10 * pxPerDeg` px apart — pick it so that equals the
     * ladder's own rung spacing (the asset's ladder is 64px tall, so 8 → a 16px gap).
     */
    pxPerDeg?: number;
};
/** Wrap a (normalized) HUD SVG element with the meter/horizon/trace setters. */
export declare function createHudController(el: SVGSVGElement, options?: HudControllerOptions): HudController;
/**
 * Build the HUD in code with tosijs `svgElements` — the default when no designed
 * asset is supplied (loadHud falls back here). Geometry matches the asset.
 */
export declare function buildFallbackHud(options?: HudControllerOptions): HudController;
/**
 * Fetch + parse the designed HUD asset and wrap it; on any failure, fall back to
 * the embedded code HUD so a HUD always renders.
 */
export declare function loadHud(url?: string, options?: HudControllerOptions): Promise<HudController>;
//# sourceMappingURL=hud.d.ts.map