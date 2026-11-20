/** The senses there are (see the table above): two built, the rest slots. */
export type SenseChannel = 'vision' | 'hearing' | 'smell' | 'vibration' | 'echolocation' | 'ir' | 'radar' | 'rdf';
/** A crouching body's conspicuity: it is noticed at a third of the distance. */
export declare const STEALTH = 0.33;
export interface Sensorium {
    /** Metres it notices you in front. */
    sightRange: number;
    /** The width of "in front", degrees. */
    sightDeg: number;
    /** Metres it notices you behind it (no line needed). */
    nearRange: number;
    /** Multiplies how far a noise carries to it. */
    hearing: number;
}
export declare const DEFAULT_SENSORIUM: Sensorium;
export interface Detectable {
    x: number;
    z: number;
    /** A clear line from the observer's eyes reaches it (the scene casts the ray). */
    clearLine: boolean;
    /** 1 standing (default), `STEALTH` crouching; multiplies every range. */
    conspicuity?: number;
}
export interface Noise {
    x: number;
    z: number;
    /** Metres it carries. */
    carries: number;
}
export interface Observer {
    x: number;
    z: number;
    heading: number;
}
/** Whether `d` is in front of the observer (within half of `sightDeg` of its heading). */
export declare function inFront(o: Observer, s: Partial<Sensorium>, d: {
    x: number;
    z: number;
}): boolean;
/**
 * Whether the observer notices `d`: `'seen'` in front with a clear line,
 * `'sensed'` behind within reach, else null. `keen` multiplies the ranges (an
 * alert creature looks harder).
 */
export declare function notices(o: Observer, s: Partial<Sensorium>, d: Detectable, keen?: number): 'seen' | 'sensed' | null;
/** Whether the observer hears `n`, from any direction. */
export declare function hears(o: Observer, s: Partial<Sensorium>, n: Noise): boolean;
//# sourceMappingURL=sensorium.d.ts.map