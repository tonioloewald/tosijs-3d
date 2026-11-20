export interface ConversationLine {
    speaker: string;
    text: string;
    /** A sound to play for it (a URL, or whatever the staging understands). */
    audio?: string;
    /** Its length, seconds; else the audio's, else read off its words. */
    seconds?: number;
    /** A gesture the speaker makes as the line starts (a clip or state name). */
    gesture?: string;
    /** Default true. False: a pick waits for the line to finish. */
    interruptible?: boolean;
}
export type ConversationCondition = {
    has: string;
    qty?: number;
} | {
    lacks: string;
    qty?: number;
} | {
    flag: string;
} | {
    not: string;
} | ConversationCondition[];
export type ConversationEffect = {
    goto: string;
} | {
    end: true;
} | {
    give: string;
    qty?: number;
} | {
    take: string;
    qty?: number;
} | {
    trade: true;
} | {
    set: string;
    value?: unknown;
};
export interface ConversationReply {
    id: string;
    /** What the player picks. */
    label: string;
    /** What the player's character says: none, a string, or a full line. */
    line?: string | Omit<ConversationLine, 'speaker'>;
    when?: ConversationCondition;
    then: ConversationEffect[];
}
export interface ConversationNode {
    lines: ConversationLine[];
    replies?: ConversationReply[];
    /** Run after the lines when there are no replies. */
    then?: ConversationEffect[];
}
export interface ConversationScript {
    start: string;
    nodes: Record<string, ConversationNode>;
    /** Who the player is, in lines and the transcript. Default `'player'`. */
    player?: string;
}
export type ConversationEvent = {
    type: 'line';
    line: ConversationLine;
    seconds: number;
} | {
    type: 'lineEnd';
    line: ConversationLine;
    cut: boolean;
} | {
    type: 'replies';
    replies: ConversationReply[];
} | {
    type: 'picked';
    reply: ConversationReply;
} | {
    type: 'effect';
    effect: ConversationEffect;
} | {
    type: 'refused';
    effect: ConversationEffect;
    reason: string;
} | {
    type: 'trade';
} | {
    type: 'end';
};
export interface ConversationHost {
    /** Does the player carry `qty` of `kind`? */
    has?: (kind: string, qty: number) => boolean;
    /** Give the player `qty` of `kind`: null, or the reason it can't be done. */
    give?: (kind: string, qty: number) => string | null;
    /** Take `qty` of `kind` from the player: null, or the reason. */
    take?: (kind: string, qty: number) => string | null;
    /** Open a trade; call `done` when it closes. */
    trade?: (done: () => void) => void;
    /** A flag's value (default: the conversation's own flags). */
    flag?: (name: string) => unknown;
    /** Set a flag (default: the conversation's own flags). */
    setFlag?: (name: string, value: unknown) => void;
    /** An audio file's length in seconds, if known. */
    duration?: (audio: string) => number | null | undefined;
    handleEvent?: (event: ConversationEvent) => void;
}
export interface TranscriptEntry {
    speaker: string;
    text: string;
    audio?: string;
    /** Seconds since the conversation started. */
    at: number;
    /** Cut short by a pick. */
    cut?: boolean;
}
export interface Conversation {
    /** The line being said, if any. */
    readonly line: ConversationLine | null;
    /** Seconds into it, and its length. */
    readonly lineAt: number;
    readonly lineSeconds: number;
    /** The replies on offer now (empty until the line is nearly done). */
    readonly replies: ConversationReply[];
    readonly node: string | null;
    readonly trading: boolean;
    readonly ended: boolean;
    readonly transcript: TranscriptEntry[];
    readonly flags: Map<string, unknown>;
    tick(dt: number): void;
    /** Pick a reply on offer: false when it is not on offer. */
    pick(id: string): boolean;
    /** Stop now (walked away). */
    end(): void;
    /** Go to a node now. */
    goto(node: string): void;
}
/** Reading time: about 180 words a minute, never under 1.2 s. */
export declare function speakingSeconds(text: string): number;
/** When a line of `seconds` is "somewhat complete": 75% through, or 0.7 s before its end if later. */
export declare function repliesDueAt(seconds: number): number;
export declare function startConversation(script: ConversationScript, host?: ConversationHost): Conversation;
//# sourceMappingURL=conversation.d.ts.map