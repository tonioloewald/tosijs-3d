/** What a description is made from (the agents' scene reading). */
export interface SceneReading {
    /** The scene's name, said first. */
    title?: string;
    you?: {
        name: string;
        kind: string;
        heading?: number;
    } | null;
    camera?: {
        heading?: number;
    } | null;
    entities?: Array<{
        name: string;
        kind: string;
        focused?: boolean;
        distance?: number;
        bearing?: number;
    }>;
    timeOfDay?: number;
    /** 0 night .. 1 full day. */
    daylight?: number;
    /** At most this many nearby things (default 5). */
    limit?: number;
}
/** Degrees (0 = +z, taken as north; 90 = +x, east) as a compass word. */
export declare function compassWord(heading: number): string;
/** A bearing (degrees to turn, negative left) as words. */
export declare function directionWords(bearing: number): string;
/** Metres as a person says them. */
export declare function distanceWords(m: number): string;
/** Hours (0..24) as a clock time. */
export declare function clockWords(hours: number): string;
/** The scene in sentences. */
export declare function describeScene(r: SceneReading): string;
//# sourceMappingURL=scene-description.d.ts.map