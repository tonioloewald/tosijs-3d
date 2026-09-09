/**
 * Did this event come from somewhere the person is typing?
 *
 * Call it before consuming a key on a global listener. Returns `false` for a
 * missing or malformed event rather than throwing — a listener that dies on a
 * synthetic event is worse than one that occasionally claims a key.
 */
export declare function isTextEntry(event: unknown): boolean;
//# sourceMappingURL=text-entry.d.ts.map