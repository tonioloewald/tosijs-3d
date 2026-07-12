import { type HudTraceOptions, type Side } from './hud-math';
import type { Pose, Vec3 } from './spatial-transform';
export type { Side } from './hud-math';
export type MeterName = 'speed' | 'altitude' | 'health' | 'energy';
export type TraceKind = 'neutral' | 'friendly' | 'hostile' | 'waypoint';
export type HudTraceInput = {
    pos: Vec3;
    kind: TraceKind;
    /** Radar has a lock on this contact — drawn with a bolder, fully-opaque stroke. */
    locked?: boolean;
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
    /** Replace the radar/waypoint traces from world positions + the viewer pose. */
    setTraces(traces: HudTraceInput[], viewer: Pose, opts: HudTraceOptions): void;
    /** Show warning lines (the `#warning` text) and flash any threat-side arc red. */
    setWarnings(warnings: HudWarning[]): void;
};
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