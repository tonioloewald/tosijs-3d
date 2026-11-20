export interface ChecklistItemSpec {
    id?: string;
    text: string;
    url?: string;
    steps?: string[];
}
export interface ChecklistSpec {
    id?: string;
    title: string;
    items?: (ChecklistItemSpec | string)[];
    sections?: {
        title?: string;
        items: (ChecklistItemSpec | string)[];
    }[];
}
export interface ChecklistItemAnswer {
    verdict: 'pass' | 'fail' | null;
    comment: string;
}
export interface ChecklistState {
    list: (ChecklistSpec & {
        id: string;
    }) | null;
    answers: Record<string, ChecklistItemAnswer>;
    total: number;
    pass: number;
    fail: number;
    open: number;
}
export interface ChecklistAnswerBody {
    listId: string;
    itemId: string;
    verdict: 'pass' | 'fail' | null;
    comment: string;
    page?: string;
    schematic?: string;
}
export declare const CHECKLIST_ENDPOINT = "/__checklist";
/** Where the scene asks: where your server mounted `checklistHandler`. */
export declare function setChecklistEndpoint(path: string): void;
/** Was the page served by a dev server with a checklist endpoint? */
export declare const hasChecklistEndpoint: () => boolean;
/** The posted list and its answers, or null (none, or not this page's to see). */
export declare function fetchChecklist(fetcher?: typeof fetch): Promise<ChecklistState | null>;
/** Send one answer, gzipped: an error message, or null when it saved. */
export declare function sendChecklistAnswer(body: ChecklistAnswerBody, fetcher?: typeof fetch): Promise<string | null>;
//# sourceMappingURL=checklist-client.d.ts.map