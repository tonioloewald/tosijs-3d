import type { HumanPack } from './human-pack.js';
import type { SweepResult } from './extremes-sweep.js';
import type { SweepSummary } from './extremes-report.js';
import type { HairPiece, ReferenceHead } from './hair-place.js';
export declare const VIEW_W = 180;
export declare const VIEW_H = 300;
export interface SheetCase {
    item: string;
    corner: string;
}
/** The cases the sheet draws: the worst body of each of the worst items. */
export declare function sheetCases(summary: SweepSummary, count?: number): SheetCase[];
/** Draw the sheet. `hair` is the library the sweep wore, when it did. */
export declare function contactSheet(pack: HumanPack, result: SweepResult, summary: SweepSummary, hair?: {
    pieces: HairPiece[];
    heads: ReferenceHead[];
}, cases?: SheetCase[]): Promise<Uint8Array>;
//# sourceMappingURL=extremes-sheet.d.ts.map