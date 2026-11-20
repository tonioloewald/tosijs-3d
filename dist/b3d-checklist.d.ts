import { type ChecklistState } from 'tosijs-ui/doc-system/checklist-client.js';
export type ChecklistVerdict = 'pass' | 'fail' | null;
export interface ChecklistAnswer {
    verdict: ChecklistVerdict;
    comment: string;
}
export interface ChecklistItemView {
    id: string;
    text: string;
    url?: string;
    steps?: string[];
}
/** One answer changed: the item, its answer now, and which half changed. */
export interface ChecklistAnswerChange extends ChecklistAnswer {
    itemId: string;
    changed: 'verdict' | 'comment';
}
type ListShape = ChecklistState['list'];
/**
 * The list's sections with an id on every item. The server gives them ids
 * when a list is posted; an item without one is numbered as tosijs-ui
 * numbers it (`s1-2`), so a hand-made state reads the same.
 */
export declare function checklistSections(list: ListShape): {
    title?: string;
    items: ChecklistItemView[];
}[];
/** Pressing a verdict gives it; pressing the one already given takes it back. */
export declare const nextVerdict: (current: ChecklistVerdict, pressed: "pass" | "fail") => ChecklistVerdict;
/** Passed, failed and still to check, as the page's panel counts them. */
export declare function checklistCounts(list: ListShape, answers: Record<string, ChecklistAnswer>): {
    pass: number;
    fail: number;
    open: number;
};
/**
 * The checklist as a panel, ONE ITEM AT A TIME (a panel scrolls badly under a
 * controller ray): the list's title and count, a pager whose dots are green
 * for passed and red for failed, then the item: its section, text, steps,
 * 👍 / 👎 and a comment. It opens on the first item still to check.
 * `handleAnswer` gets every change; the panel keeps its own answers as they
 * are given, and turning a page rebuilds it in place (`handleReplace`, as a
 * panel's folding does). Answers given elsewhere go in with the returned
 * element's `setAnswers(answers)`, which updates what is shown in place (a
 * comment being typed keeps its caret) and reports nothing.
 */
export declare function checklistPanel(state: {
    list: ListShape;
    answers: Record<string, ChecklistAnswer>;
}, handleAnswer: (change: ChecklistAnswerChange) => void, options?: {
    width?: number;
    page?: number;
    /** The item shown changed (to keep it across a rebuild). */
    handlePage?: (page: number) => void;
}): SVGSVGElement & {
    setAnswers: (answers: Record<string, ChecklistAnswer>) => void;
};
interface ChecklistHost extends HTMLElement {
    xrActive?: boolean;
}
/**
 * Watch for a test checklist and keep a system-bar button for it on `host`
 * while one is waiting. Returns the way to stop. Does nothing (and fetches
 * nothing) unless the page was served with a checklist endpoint, or inside a
 * frame (a test runner's), where nobody answers.
 */
export declare function watchSceneChecklist(host: ChecklistHost): () => void;
export {};
//# sourceMappingURL=b3d-checklist.d.ts.map