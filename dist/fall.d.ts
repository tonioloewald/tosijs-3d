/** How far below the takeoff a body must be before a walk off a ledge reads as a fall. */
export declare const FALL_START_DROP = 0.6;
export interface FallRules {
    /** Metres of drop past which a landing is hard. */
    hardLanding: number;
    /** Metres of drop past which a landing kills (Infinity: never). */
    lethalFall: number;
}
/**
 * The rules for a body `bodyHeight` metres tall. `hardLanding` and
 * `lethalFall` are metres; 0 (or absent) takes the default: a hard landing
 * from 1.5 body heights, and no lethal fall.
 */
export declare function fallRules(bodyHeight: number, options?: {
    hardLanding?: number;
    lethalFall?: number;
}): FallRules;
export type LandingOutcome = 'soft' | 'hard' | 'lethal';
/** What a landing after dropping `drop` metres is. */
export declare function landingOutcome(drop: number, rules: FallRules): LandingOutcome;
//# sourceMappingURL=fall.d.ts.map