import type { Widget3d } from './widgets3d.js';
export interface Pager3dOptions {
    /** How many pages. */
    count: number;
    /** The page shown, from 0. */
    index: number;
    /** A page asked for, by an arrow or a dot. */
    handleChange?: (index: number) => void;
    /** A dot's colour, or `undefined` for the theme's. */
    dotColor?: (index: number) => string | undefined;
    /** Past this many pages, `3 / 20` stands in for the dots. */
    maxDots?: number;
    /** Its accessible name. Default `page`. */
    name?: string;
}
/** Where a press at `x` lands: an arrow, a dot, or nothing. Pure. */
export declare function pagerTarget(x: number, width: number, rowH: number, count: number, dots: boolean): {
    kind: 'prev' | 'next';
} | {
    kind: 'dot';
    index: number;
} | null;
export interface Pager extends Widget3d {
    /** The page shown. */
    readonly index: number;
    /** Show another page without reporting it (the host moved it). */
    setIndex(index: number): void;
    /** Draw again: after a `dotColor` answer changed. */
    refresh(): void;
}
export declare function pager3d(config: Pager3dOptions): Pager;
//# sourceMappingURL=pager-field.d.ts.map