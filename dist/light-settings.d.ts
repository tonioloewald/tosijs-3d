import { type LightProgram } from './light-modulation.js';
import type { CurveIssue } from './curve.js';
/** What kind of lamp. Matches the three `b3d-lamp` elements. */
export type LightKind = 'point' | 'spot' | 'area';
/** A complete lamp description — everything the editor produces. */
export interface LightSettings {
    kind: LightKind;
    /** Switched on. Runs the program's attack; `false` runs its decay. */
    on: boolean;
    /** Hue in degrees, 0..360. */
    hue: number;
    /** Saturation 0..1. `0` is white. */
    saturation: number;
    intensity: number;
    range: number;
    shadows: boolean;
    /** Cone angle in degrees. `spot` only. */
    angle: number;
    /** The time-varying half. */
    program: LightProgram;
}
export declare const DEFAULT_LIGHT: LightSettings;
/**
 * The settings' colour as a hex string, ready for a lamp's `diffuse`.
 *
 * Full VALUE always: dimming is `intensity`'s job, and a colour that also
 * carried brightness would fight it — the same rule the modulation model
 * follows when it shifts hue.
 */
export declare function lightColor(s: Pick<LightSettings, 'hue' | 'saturation'>): string;
/**
 * JSON Schema for a whole `LightSettings`, as ONE field.
 *
 * This is the piece that makes a lamp free for a consumer generating panels
 * from schema: mark a field with it and they get the power switch, the colour,
 * the intensity and the program editor, with no widget code of their own.
 *
 * `x-widget: 'light'` and not `'lamp'` — the vocabulary elsewhere (b3d-lamp's
 * elements, `LightKind`, `lightColor`) all says light, and a token that
 * disagrees with the type names it edits is a small tax paid forever.
 */
export declare function lightSettingsSchema(extra?: Record<string, unknown>): Record<string, unknown>;
/**
 * Canonical bytes for a lamp — every number rounded, keys in a fixed order.
 *
 * Same contract as `canonicalCurve`: a consumer diffs these by hand, so the
 * same edit must always produce the same bytes.
 */
export declare function canonicalLight(s: LightSettings): LightSettings;
/**
 * Report what is wrong with a `LightSettings` without throwing or fixing it.
 *
 * Exists for symmetry with `validateCurve` / `validateProgram`: a consumer that
 * embeds a lamp in a document validates the whole document, and a hole in the
 * set means one field silently goes unchecked. Paths are RELATIVE, for the
 * consumer to prefix with the field's own path.
 */
export declare function validateLight(value: unknown): CurveIssue[];
//# sourceMappingURL=light-settings.d.ts.map