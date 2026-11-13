/**
 * A page-wide mute shared by everyone who holds it: the volume is read when
 * the first hold is taken and put back when the last is released, unless
 * something else changed it meanwhile. Pure; `<tosi-b3d>` uses it for
 * Babylon's own sounds while a scene is behind its spinner.
 */
export declare function sharedMute(get: () => number, set: (volume: number) => void): () => () => void;
//# sourceMappingURL=shared-mute.d.ts.map