/*#
# Icon grid

**`iconGrid3d` — one control for a segmented select, a tool palette and a mode
picker.** A grid of icons with optional captions, as a `Widget3d`, so it works
flat, on an in-scene panel and in a headset unchanged.

## Demo

One grid per meaning, so the difference is visible rather than described. The
last one shows `change` imposing a rule the modes do not have.

```js
import { b3d, b3dLight, panelScene, panel3d, label3d, iconGrid3d } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, pre } = elements

const out = pre({ style: 'margin:8px 16px;color:#8ea;font:12px ui-monospace,monospace' }, '')
const state = { tool: 'move', shown: ['map'], log: '', tools: ['select', 'move'] }
const show = () => {
  out.textContent =
    `tool: ${state.tool}\nshown: ${state.shown.join(', ') || '(none)'}\n` +
    `tools: ${state.tools.join(' + ') || '(none)'}\n${state.log}`
}

const TOOLS = [
  { icon: 'move', label: 'move' },
  { icon: 'rotateCw', label: 'turn' },
  { icon: 'resize', label: 'scale' },
  { icon: 'trash', label: 'delete' },
]
const LAYERS = [
  { icon: 'map', label: 'map' },
  { icon: 'cloud', label: 'sky' },
  { icon: 'camera', label: 'cam' },
]
// A MENU CELL sits in the same strip as ordinary buttons. `load` opens actions
// instead of firing one, and because it has a `menu` it never joins the
// selection — so in a radio palette it cannot steal the lit slot from the
// active tool. Disabled items stay PRESENT: "revert" greys out when there is
// nothing to revert, rather than vanishing and reflowing the menu under you.
//
// `disabled` is a PREDICATE, which is what lets this array be a constant —
// declared once here and never rebuilt, yet always telling the truth about
// `state.log`. Toggle it with "copy" and re-open the menu to watch Revert wake
// up, without a line of rebuild-on-change plumbing anywhere.
const ACTIONS = [
  { icon: 'copy', label: 'copy' },
  { icon: 'downloadCloud', label: 'save' },
  {
    icon: 'uploadCloud',
    label: 'load',
    menu: [
      { label: 'Recent scene', icon: 'star' },
      { label: 'From file…', icon: 'uploadCloud' },
      { label: 'Revert', icon: 'rotateCcw', disabled: () => state.log === '' },
    ],
  },
]

// NO CAPTIONS, 2-D — which is the point of the control. Saving space is why you
// reach for a grid, and a caption is what forces a narrow column: without them
// the same items fit six across instead of four. (Tooltips are the missing half;
// see TODO — there is no hover in a headset, so it is not just a title attr.)
const PALETTE = [
  'move', 'rotateCw', 'resize', 'trash',
  'copy', 'camera', 'map', 'cloud',
  'star', 'compass', 'settings', 'bug',
].map((icon) => ({ icon }))

// THE RULE ENSEMBLE ACTUALLY WANTS, and it is none of the three modes.
//
// Tonio: "select move rotate scale, where scale turns off move and rotate, and
// move and rotate turn off scale but can coexist and select is independent."
//
// So: two mutually exclusive GROUPS that are each internally free, plus one
// member that ignores the whole arrangement. `checkbox` gets the coexistence and
// none of the exclusion; `radio` gets the exclusion and none of the coexistence.
// This is what `handleChange` is for — the grid owns layout, the consumer owns
// meaning.
//
// (Line comments: a block comment would close the enclosing `/*#` doc fence.
// Third time I have done that, hence the note.)
const TOOLBOX = [
  { icon: 'mousePointer', label: 'select' },
  { icon: 'move', label: 'move' },
  { icon: 'rotateCw', label: 'rotate' },
  { icon: 'resize', label: 'scale' },
]
const SELECT = 0, MOVE = 1, ROTATE = 2, SCALE = 3

const toolRule = ({ index, selection }) => {
  const has = (i) => selection.includes(i)
  // `select` answers to nobody.
  if (index === SELECT) return selection
  if (index === SCALE && has(SCALE)) {
    // Scale just came on: it evicts the pair.
    return selection.filter((i) => i !== MOVE && i !== ROTATE)
  }
  if ((index === MOVE || index === ROTATE) && has(index)) {
    // Either of the pair came on: it evicts scale, and they may coexist.
    return selection.filter((i) => i !== SCALE)
  }
  // Turning something OFF needs no adjudication.
  return selection
}

const panel = panel3d(
  { width: 300 },
  label3d({ text: 'radio — one tool at a time', muted: true, compact: true }),
  iconGrid3d({
    items: TOOLS, mode: 'radio', selected: 0,
    handleSelect: ([i]) => { state.tool = TOOLS[i].label; show() },
  }),
  label3d({ text: 'checkbox — any layers, but never none', muted: true, compact: true }),
  iconGrid3d({
    items: LAYERS, mode: 'checkbox', selected: [0],
    // The rule the modes do not have: refuse to empty the set.
    handleChange: ({ selection, previous }) => (selection.length ? selection : previous),
    handleSelect: (sel) => { state.shown = sel.map((i) => LAYERS[i].label); show() },
  }),
  label3d({ text: 'buttons — fire and forget', muted: true, compact: true }),
  iconGrid3d({
    items: ACTIONS, mode: 'buttons',
    handleActivate: (i, item) => { state.log = `fired: ${item.label}`; show() },
    handleMenuSelect: (action, i, cell) => {
      state.log = `menu: ${action.label} (from ${ACTIONS[cell].label})`; show()
    },
  }),
  label3d({ text: 'no captions — 12 tools in the space of 4', muted: true, compact: true }),
  iconGrid3d({ items: PALETTE, mode: 'radio', selected: 0, columns: 6 }),
  label3d({ text: "ensemble's tool rule — scale fights move+rotate", muted: true, compact: true }),
  iconGrid3d({
    items: TOOLBOX, mode: 'checkbox', selected: [SELECT, MOVE],
    handleChange: toolRule,
    handleSelect: (sel) => { state.tools = sel.map((i) => TOOLBOX[i].label); show() },
  })
)
show()

const { plane, sceneCreated } = panelScene({ svg: panel, target: panel, width: 2.2, camera: { radius: 3 } })
const scene = b3d({ style: 'flex:1;min-width:0;border-radius:8px;overflow:hidden', sceneCreated }, b3dLight({ intensity: 1 }), plane)

preview.append(
  div(
    { style: 'display:flex;flex-direction:column;height:100%;background:#0c0e14' },
    div(
      { style: 'display:flex;gap:20px;flex:1;min-height:0;padding:14px 14px 4px' },
      div({ style: 'color:#9ab;font:12px system-ui;flex:0 0 300px;overflow:auto' }, 'DOM', panel),
      div({ style: 'display:flex;flex:1;min-width:0;flex-direction:column;gap:6px;color:#9ab;font:12px system-ui' }, '3D texture — same widget', scene)
    ),
    out
  )
)
```
```css
.preview {
  height: 100%;
}
```
## The control owns LAYOUT; the consumer owns MEANING

Three widgets collapse into one because the difference between them was never
layout — it was semantics. So `mode` picks the common case (`buttons` fire and
forget, `radio` is one-of-N, `checkbox` is any-of-N) and `handleChange` lets a consumer
impose something more particular: mutually exclusive subgroups, a mode that
refuses to turn itself off, a tool that arms rather than toggles.

`handleChange` receives what WOULD happen and returns what should. Returning the
previous selection is a veto; there is no separate cancel flag, because one way
to say no is easier to get right than two.

## Cell size is the dial, and XR is NOT a third size

Two cases: **48 px** for touch, **24 px** for a pointer, sniffed from
`(pointer: coarse)` and overridable. That is the whole decision.

It is tempting to add a third, larger size for XR on the grounds that a
controller ray is imprecise. Tonio overruled exactly that, and the reasoning is
better than mine was: _"we shouldn't make special size allowances for XR UI
targets, we should scale XR so that pointer or touch targets make sense, since XR
users also need to be able to read stuff."_

Growing the targets in UI units leaves the glyphs where they are and inflates the
buttons around them, so you buy hit accuracy by making the panel **harder to
read** — the wrong trade for the medium with the lowest effective resolution.
Scaling the whole panel in world space moves both together.

## Captions are what force a narrow column

Four columns by default. Without captions a cell is only as wide as its icon, so
a caption-less grid can be much wider — which is why `columns` defaults from
whether anything is captioned rather than being a fixed number.

*/
/*{ "parent": "UI", "order": 262 }*/
import { svgElements } from 'tosijs';
import { iconGlyph } from './svg-icons.js';
import { w3dTheme } from './w3d-theme.js';
import { openMenu3d, resolveDynamic } from './widgets3d.js';
const { g, rect, text } = svgElements;
/**
 * Touch or pointer, and nothing else.
 *
 * `(pointer: coarse)` is the honest question — "is the primary pointer
 * imprecise" — rather than sniffing a device. Falls back to the pointer size
 * where there is no `matchMedia` at all (tests, SSR), because a too-small target
 * is recoverable and a grid that will not fit its panel is not.
 */
function defaultCellSize() {
    const mm = globalThis.matchMedia;
    if (typeof mm !== 'function')
        return 24;
    try {
        return mm('(pointer: coarse)').matches ? 48 : 24;
    }
    catch {
        return 24;
    }
}
const toArray = (v) => v == null ? [] : Array.isArray(v) ? [...v] : [v];
/**
 * A grid of icon buttons.
 *
 * ```js
 * iconGrid3d({
 *   mode: 'radio',
 *   selected: 0,
 *   items: [{ icon: 'move', label: 'move' }, { icon: 'rotateCw', label: 'turn' }],
 *   handleSelect: ([i]) => setTool(i),
 * })
 * ```
 */
export function iconGrid3d(config) {
    const items = config.items ?? [];
    const mode = config.mode ?? 'buttons';
    const captioned = items.some((i) => i.label != null && i.label !== '');
    const columns = Math.max(1, config.columns ?? (captioned ? 4 : 6));
    const cell = Math.max(12, config.cellSize ?? defaultCellSize());
    let selection = toArray(config.selected);
    const el = g({ 'data-w3d': 'icon-grid' });
    const cells = items.map(() => {
        const wrap = g();
        el.appendChild(wrap);
        return wrap;
    });
    // Geometry from the last layout, so the pointer routes through what was drawn.
    let boxes = [];
    let rowHeight = 0;
    // The panel that hosts this grid, when there is one. It is how a cell opens a
    // menu — the route tosijs-3d#59 found missing.
    let host = null;
    let hovered = -1;
    let pressed = -1;
    const captionH = captioned ? Math.round(w3dTheme.fontSize * 0.95) : 0;
    const cellH = cell + (captioned ? captionH + 2 : 0);
    const at = (x, y) => {
        for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
                return i;
        }
        return -1;
    };
    const isOn = (i) => selection.includes(i);
    /**
     * Asked at draw AND at press, never remembered — `disabled` may be a
     * predicate over live state, and the whole point of allowing one is that the
     * answer is allowed to change without the palette being rebuilt.
     */
    const isDisabled = (i) => resolveDynamic(items[i]?.disabled, false) === true;
    const draw = () => {
        cells.forEach((wrap, i) => {
            while (wrap.firstChild)
                wrap.removeChild(wrap.firstChild);
            const b = boxes[i];
            if (b == null)
                return;
            const item = items[i];
            const on = isOn(i);
            const off = isDisabled(i);
            /*
            Three states that never compete: SELECTED is a background, hover/press are
            also backgrounds but transient, and the glyph colour carries the pressed
            state. `selectedBg` rather than `buttonActive` — `buttonActive` is the
            PRESS colour, so using it for selection makes a selected cell look
            permanently held down and pressing it show nothing. Same bug iconBar3d
            had.
            */
            const bg = off
                ? 'transparent'
                : i === pressed
                    ? w3dTheme.buttonActive
                    : on
                        ? w3dTheme.selectedBg
                        : i === hovered
                            ? w3dTheme.buttonHover
                            : 'transparent';
            wrap.appendChild(rect({
                x: b.x,
                y: b.y,
                width: b.w,
                height: b.h,
                rx: w3dTheme.roundedRadius,
                ry: w3dTheme.roundedRadius,
                fill: bg,
            }));
            const size = Math.round(cell * 0.58);
            wrap.appendChild(iconGlyph(item.icon, {
                color: off
                    ? w3dTheme.disabledText
                    : i === pressed
                        ? w3dTheme.buttonActiveText
                        : on
                            ? w3dTheme.text
                            : w3dTheme.muted,
                size,
                x: b.x + (b.w - size) / 2,
                y: b.y + (cell - size) / 2,
            }));
            if (captioned && item.label) {
                wrap.appendChild(text({
                    x: b.x + b.w / 2,
                    y: b.y + cell + captionH - 2,
                    'text-anchor': 'middle',
                    'font-family': w3dTheme.fontFamily,
                    'font-size': String(Math.round(w3dTheme.fontSize * 0.8)),
                    fill: off ? w3dTheme.disabledText : w3dTheme.muted,
                }, item.label));
            }
        });
    };
    /** Apply a press: derive the selection the mode implies, then let `change` rule. */
    const activate = (i) => {
        const item = items[i];
        if (item == null || isDisabled(i))
            return;
        /*
        A MENU CELL NEVER JOINS THE SELECTION, whatever the grid's mode.
    
        The palette that motivated this (tosijs-3d#59) mixes both: select / move /
        rotate / scale are a mode — one of them is true at a time and stays lit —
        while "Load ▾" and "Save ▾" sit in the same strip and are one-shot. If a
        menu cell took the radio slot, opening Load would silently deselect your
        tool, and closing the menu without choosing would leave the palette lying
        about which tool is active.
    
        So it behaves like a `buttons` cell regardless: it fires, it opens, nothing
        lights. `handleActivate` still runs — the press really did happen — and it
        receives the host, so a consumer can open something of their own instead.
        */
        if (item.menu != null && item.menu.length > 0) {
            config.handleActivate?.(i, item, host ?? undefined);
            if (host != null) {
                const b = boxes[i];
                openMenu3d(host, b != null
                    ? { x: b.x, y: b.y, width: b.w, height: b.h }
                    : { x: 0, y: 0, width: 0, height: 0 }, item.menu, {
                    handleSelect: (action, k) => config.handleMenuSelect?.(action, k, i),
                });
            }
            return;
        }
        const previous = [...selection];
        let next;
        if (mode === 'radio')
            next = [i];
        else if (mode === 'checkbox')
            next = isOn(i)
                ? selection.filter((s) => s !== i)
                : [...selection, i].sort((a, b) => a - b);
        else
            next = previous; // buttons: nothing stays lit
        if (config.handleChange != null) {
            next =
                config.handleChange({ index: i, selection: next, previous }) ?? previous;
        }
        const changed = next.length !== previous.length || next.some((v, k) => v !== previous[k]);
        selection = next;
        // handleActivate fires on EVERY press — that is the button-bar path, and it must
        // not depend on whether the selection happened to move.
        config.handleActivate?.(i, item, host ?? undefined);
        if (changed)
            config.handleSelect?.([...selection]);
        draw();
    };
    return {
        el,
        setHost(h) {
            host = h;
        },
        layout(width) {
            const gap = Math.max(2, Math.round(w3dTheme.spacing * 0.4));
            const cols = Math.max(1, Math.min(columns, items.length || 1));
            const cw = Math.max(cell, (width - gap * (cols - 1)) / cols);
            boxes = items.map((_, i) => ({
                x: Math.round((i % cols) * (cw + gap)),
                y: Math.round(Math.floor(i / cols) * (cellH + gap)),
                w: Math.round(cw),
                h: cellH,
            }));
            const rows = Math.ceil((items.length || 1) / cols);
            rowHeight = rows * cellH + (rows - 1) * gap;
            draw();
            return rowHeight;
        },
        handle(kind, x, y) {
            if (kind === 'leave') {
                hovered = -1;
                pressed = -1;
                draw();
                return;
            }
            const i = at(x, y);
            if (kind === 'move') {
                if (i !== hovered) {
                    hovered = i;
                    draw();
                }
                return;
            }
            if (kind === 'down') {
                pressed = i;
                draw();
                return;
            }
            if (kind === 'up') {
                // Only fire if the release lands on the cell the press started in —
                // the same rule a button follows, so a mis-aimed drag can be aborted by
                // sliding off rather than being committed on release.
                const fired = pressed;
                pressed = -1;
                if (fired >= 0 && fired === i)
                    activate(fired);
                else
                    draw();
            }
        },
        hitTest(x, y) {
            return at(x, y) >= 0;
        },
        /*
        D-PAD: left/right walks the row, up/down changes row, and running off any
        edge escapes to the host. A grid that trapped focus would be worse than one
        with no traversal at all, because there would be no way out without a
        pointer — which is the situation a headset user is in.
        */
        focusMove(dx, dy) {
            const cols = Math.max(1, Math.min(columns, items.length || 1));
            const current = hovered >= 0 ? hovered : 0;
            const col = current % cols;
            const row = Math.floor(current / cols);
            if (dx !== 0) {
                const nextCol = col + (dx > 0 ? 1 : -1);
                if (nextCol < 0 || nextCol >= cols)
                    return false;
                const idx = row * cols + nextCol;
                if (idx >= items.length)
                    return false;
                hovered = idx;
                draw();
                return true;
            }
            if (dy !== 0) {
                const nextRow = row + (dy > 0 ? 1 : -1);
                const idx = nextRow * cols + col;
                if (nextRow < 0 || idx >= items.length)
                    return false;
                hovered = idx;
                draw();
                return true;
            }
            return true;
        },
        focusActivate() {
            if (hovered >= 0)
                activate(hovered);
        },
        focusClear() {
            hovered = -1;
            draw();
        },
        get selection() {
            return [...selection];
        },
        setSelection(next) {
            selection = [...next];
            draw();
        },
    };
}
//# sourceMappingURL=icon-grid.js.map