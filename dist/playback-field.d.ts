import type { Widget3d } from './widgets3d.js';
/** What the host's clip is doing now. */
export interface PlaybackState {
    /** Where it is, in seconds. */
    time: number;
    /** Its length, in seconds. */
    duration: number;
    playing: boolean;
    /** Its playback speed, 1 = as made. */
    speed: number;
}
export interface Playback3dOptions {
    /** Its accessible name (default `playback`). */
    name?: string;
    /** The clip as it is now; asked a few times a second while shown. */
    read: () => PlaybackState | null;
    /** Play (true) or pause (false), from the button. */
    handlePlay?: (playing: boolean) => void;
    /** Go to this time, in seconds, from the scrub bar. The clip is paused first. */
    handleSeek?: (time: number) => void;
    /** A speed from the menu. */
    handleSpeed?: (speed: number) => void;
    /** The speeds offered. */
    speeds?: number[];
    /** How often the row reads the clip, per second (default 12). */
    rate?: number;
}
export interface PlaybackField extends Widget3d {
    /** Read the clip now and redraw. */
    refresh(): void;
}
/**
 * A clip's transport: play/pause, a scrub bar and a speed menu, on one row.
 *
 * ```js
 * playback3d({ read: () => ({ time, duration, playing, speed }), handlePlay, handleSeek, handleSpeed })
 * ```
 */
export declare function playback3d(config: Playback3dOptions): PlaybackField;
//# sourceMappingURL=playback-field.d.ts.map