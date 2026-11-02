import type { Corner } from './extremes-corners.js';
import type { SweepItem, SweepResult } from './extremes-sweep.js';
export declare const FAIL_FRACTION = 0.002;
export declare const FAIL_MIN_VERTICES = 3;
export type Verdict = 'holds' | 'fails-at-extremes' | 'broken-at-default';
export interface ItemSummary {
    item: SweepItem;
    vertices: number;
    verdict: Verdict;
    /** Bodies it fails on, of all swept. */
    failing: number;
    bodies: number;
    atDefault: {
        visible: number;
        depth: number;
    };
    worst: {
        corner: string;
        visible: number;
        fraction: number;
        depth: number;
        rawDepth: number;
    };
}
export interface WorstCase {
    item: string;
    corner: string;
    visible: number;
    fraction: number;
    depth: number;
}
export interface BoneSummary {
    kind: string;
    joint: string;
    bodies: number;
    worst: {
        corner: string;
        detail: string;
    };
}
export interface SweepSummary {
    thresholds: {
        fraction: number;
        minVertices: number;
        toleranceMm: number;
    };
    bodies: number;
    items: ItemSummary[];
    worstCases: WorstCase[];
    /** Bodies by how many items fail on them. */
    hardestBodies: Array<{
        corner: string;
        group: string;
        failing: number;
    }>;
    bones: BoneSummary[];
    boneBaseline: string[];
    /** Clothes that hold up, CC0, by slot: the starter-wardrobe pool. */
    candidates: Record<string, string[]>;
}
export declare const fails: (visible: number, vertices: number) => boolean;
export declare function summarise(result: SweepResult): SweepSummary;
/** What a corner's id means, for people. */
export declare function describeCorner(id: string): string;
export declare function renderMarkdown(meta: Record<string, unknown>, s: SweepSummary, result: SweepResult, sheet: {
    file: string;
    cases: Array<{
        item: string;
        corner: string;
    }>;
} | null): string;
export type { Corner };
//# sourceMappingURL=extremes-report.d.ts.map