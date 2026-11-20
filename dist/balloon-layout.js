/*#
# balloon layout

Where a speech balloon's caption and replies go ([[b3d-conversation]]): the
caption wrapped to the balloon's width, the replies as numbered rows under
it, the balloon standing on the bottom of its drawing so its tail meets the
speaker's head, and which row a point is on. A caption too long for the room
the replies leave is cut with an ellipsis. Pure.
*/
/*{ "parent": "b3d-conversation" }*/
/** The balloon's drawing area (viewBox units); the plane keeps this aspect. */
export const BALLOON_W = 480;
export const BALLOON_H = 340;
export const BALLOON_PAD = 18;
export const BALLOON_FONT = 22;
const PAD = BALLOON_PAD;
const FONT = BALLOON_FONT;
const LINE_H = 28;
const ROW_H = 38;
const TAIL = 22;
/** Words wrapped to lines of at most `chars` characters. */
export function wrapText(value, chars) {
    const out = [];
    let line = '';
    for (const word of value.split(/\s+/).filter(Boolean)) {
        if (line && line.length + 1 + word.length > chars) {
            out.push(line);
            line = word;
        }
        else
            line = line ? `${line} ${word}` : word;
    }
    if (line)
        out.push(line);
    return out;
}
/**
 * Where a balloon's caption and replies go: the balloon sits on the bottom of
 * the drawing (its tail on the speaker's head), as tall as it needs. Pure.
 */
export function balloonLayout(caption, replies) {
    const chars = Math.floor((BALLOON_W - PAD * 2) / (FONT * 0.52));
    const room = Math.floor((BALLOON_H - TAIL - PAD * 2 - replies.length * ROW_H) / LINE_H);
    let wrapped = caption ? wrapText(caption, chars) : [];
    if (wrapped.length > Math.max(1, room)) {
        wrapped = wrapped.slice(0, Math.max(1, room));
        wrapped[wrapped.length - 1] += '…';
    }
    const h = PAD * 2 +
        wrapped.length * LINE_H +
        replies.length * ROW_H +
        (wrapped.length > 0 && replies.length > 0 ? 8 : 0);
    const box = { x: 4, y: BALLOON_H - TAIL - h, w: BALLOON_W - 8, h };
    let y = box.y + PAD;
    const lines = wrapped.map((t) => {
        const at = { text: t, y: y + FONT };
        y += LINE_H;
        return at;
    });
    if (lines.length > 0 && replies.length > 0)
        y += 8;
    const rows = replies.map((r, i) => {
        const row = { id: r.id, label: `${i + 1}. ${r.label}`, y, h: ROW_H - 4 };
        y += ROW_H;
        return row;
    });
    return { box, lines, rows };
}
/** The reply row under a point, if any. Pure. */
export function rowAt(layout, x, y) {
    const { box } = layout;
    if (x < box.x || x > box.x + box.w)
        return null;
    return layout.rows.find((r) => y >= r.y && y <= r.y + r.h)?.id ?? null;
}
//# sourceMappingURL=balloon-layout.js.map