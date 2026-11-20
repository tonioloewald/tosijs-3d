/** The balloon's drawing area (viewBox units); the plane keeps this aspect. */
export declare const BALLOON_W = 480;
export declare const BALLOON_H = 340;
export declare const BALLOON_PAD = 18;
export declare const BALLOON_FONT = 22;
/** Words wrapped to lines of at most `chars` characters. */
export declare function wrapText(value: string, chars: number): string[];
export interface BalloonLayout {
    /** The balloon's box, viewBox units; its tail hangs below it to the bottom. */
    box: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    lines: {
        text: string;
        y: number;
    }[];
    rows: {
        id: string;
        label: string;
        y: number;
        h: number;
    }[];
}
/**
 * Where a balloon's caption and replies go: the balloon sits on the bottom of
 * the drawing (its tail on the speaker's head), as tall as it needs. Pure.
 */
export declare function balloonLayout(caption: string, replies: {
    id: string;
    label: string;
}[]): BalloonLayout;
/** The reply row under a point, if any. Pure. */
export declare function rowAt(layout: BalloonLayout, x: number, y: number): string | null;
//# sourceMappingURL=balloon-layout.d.ts.map