export interface TouchPoint {
    x: number;
    y: number;
}
export type TwoFingerStep = {
    kind: 'pending';
} | {
    kind: 'pan';
    dx: number;
    dy: number;
} | {
    kind: 'zoom';
    ratio: number;
};
export interface TwoFingerGesture {
    /**
     * One move of a two-finger gesture. `spacing` is the distance between the
     * fingers, `centroid` their midpoint, both in pixels. Returns what to do
     * with this move. A pan's `dx`/`dy` are centroid pixels; a zoom's `ratio`
     * multiplies the radius (below 1 zooms in).
     */
    step: (prevSpacing: number, spacing: number, prevCentroid: TouchPoint, centroid: TouchPoint) => TwoFingerStep;
    /** The gesture ended; the next one decides afresh. */
    reset: () => void;
    readonly mode: 'pending' | 'pan' | 'zoom';
}
export declare function twoFingerGesture(options?: {
    decidePx?: number;
}): TwoFingerGesture;
export type WheelKind = 'pan' | 'zoom';
export interface WheelSample {
    deltaX: number;
    deltaY: number;
    deltaMode: number;
    ctrlKey: boolean;
}
export declare function wheelClassifier(gapMs?: number): {
    /** `now` in milliseconds (an event's `timeStamp`). */
    kind(e: WheelSample, now: number): WheelKind;
};
//# sourceMappingURL=touch-gesture.d.ts.map