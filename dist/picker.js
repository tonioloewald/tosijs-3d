/*#
# picker

**`picker3d` — choosing one of many.** A select is right for five options and a
scroll for five hundred; this is the other end. It composes controls that
already exist — a [[table]] for the virtualized, filterable list, an
[[keyboard|inputField]] for the query, a [[widgets3d|select3d]] for the group —
so there is no new machinery here, only the arrangement.

## Demo

Five hundred and sixty-one names, in the shape a real model library has them:
`family_thing-variant`. Type to narrow, or pick a family first.

```js
import { panel3d, label3d, picker3d } from 'tosijs-3d'
import { elements } from 'tosijs'

const { div } = elements
const readout = div({ class: 'readout' }, 'nothing picked')

// Stand-in for a library catalogue — same naming shape, generated so the demo
// carries no 561-entry literal.
const FAMILIES = ['commercial', 'residential', 'roads', 'car', 'nature', 'furniture', 'industry', 'signage', 'debris']
const KINDS = ['building', 'block', 'tower', 'bend', 'straight', 'corner', 'crossing', 'barrier', 'lamp', 'bench', 'crate']
const options = []
for (const f of FAMILIES) {
  for (const k of KINDS) {
    for (const v of ['a', 'b', 'c', 'd', 'e']) {
      options.push({ value: `${f}_${k}-${v}`, label: `${k}-${v}`, group: f })
    }
  }
}

preview.append(
  panel3d({ width: 320 },
    label3d({ text: `library — ${options.length} models` }),
    picker3d({
      label: 'model',
      value: options[0].value,
      options,
      handleChange: (v) => { readout.textContent = `picked: ${v}` },
    })
  ),
  readout
)
```
```css
.preview { padding: 12px; }
.readout {
  padding: 10px 2px;
  font-family: ui-monospace, monospace;
  color: #9aa4b2;
}
```

## Why not a bigger popup

`tosijs-3d-ensemble` put it exactly, having landed 561 Kenney models into a
palette built on `select3d`:

> The original item asked for "a real popup select" because `select3d` is a
> cycler. With 561 entries that understates it: **even a flat popup is a scroll,
> not a choice.**

A list you scroll is a list you read. The fix is not more pixels, it is fewer
candidates — so the popup's job is to get from five hundred to five before you
look at anything.

## Two levels, without a tree

Their content's own names give a natural taxonomy —
`commercial_building-a`, `roads_road-bend-barrier`, `car_debris-bolt` — and the
obvious response is a tree widget. This does it with **a group chooser and a
filter field** instead, which reaches the same place with two controls you
already know how to drive.

That is not only a simplicity argument. A tree needs a pointer to expand and
collapse; two flat controls need a D-pad and a text field, both of which work
from a controller in a headset. The tree would have been the version that only
works flat.

## Filtering is AND across terms, over the whole name

Typing `commercial bend` matches `commercial_road-bend-a`, because every
space-separated term must appear somewhere in the group, the label or the value.
One term over a concatenated string would make word ORDER matter, which is the
thing nobody can guess: an author who thinks "the bend, in commercial" would
type it that way and find nothing.

Selection survives filtering — that is [[table]]'s rule, and it matters most
here: a search box that discards what you had chosen is destructive rather than
helpful.

## It asks for a LAYER, and copes with being refused

A five-hundred-row list is bigger than most panels, and `showPopup` caps to the
panel's own bounds — which on a short panel gives a list squeezed to nothing,
placed over the control it belongs to. So this asks for `showLayer` (unbounded,
above the panel) and falls back to a bounded popup sized to what is actually
available. Same reasoning as the on-screen keyboard, and the same fallback.

## Options

| option | | |
| --- | --- | --- |
| `options` | | `string[]`, or `{value, label?, group?}[]` |
| `value` | `''` | the current selection |
| `label` | — | drawn to the left of the closed control |
| `filter` | `'auto'` | `'auto'` shows the query field above `filterAbove` options |
| `filterAbove` | `12` | where `'auto'` starts showing it |
| `groups` | `'auto'` | `'auto'` shows the group chooser when there is more than one group |
| `placeholder` | `'choose…'` | shown when nothing is selected |
| `handleChange` | | the chosen value; fires on pick, and the popup closes |
*/
/*{ "parent": "UI", "order": 273 }*/
import { svgElements } from 'tosijs';
import { w3dTheme } from './w3d-theme.js';
import { handlerOf } from './handler-of.js';
import { iconGlyph } from './svg-icons.js';
import { table } from './table.js';
import { inputField } from './keyboard.js';
import { select3d } from './widgets3d.js';
const { g, rect, text } = svgElements;
/*
THE SENTINEL IS A LITERAL NUL, WRITTEN AS AN ESCAPE.

It sorts before every real group name and cannot collide with one. Written as
a raw byte it made this whole file BINARY to git: `git diff` reported
`Bin 0 -> 13984 bytes` with zero hunks, so 438 lines of new public API were
invisible to `git log -p`, GitHub's PR view, `grep` (which prints
"Binary file matches" and suppresses the content) and to all four lenses of
the pre-release review, which independently rediscovered the NUL instead of
reading the code.

`'\\0all'` is byte-identical at runtime and greppable, which is the whole
point of this repo's source discipline.
*/
const ALL_GROUPS = '\0all';
const normalise = (o) => typeof o === 'string' ? { value: o } : o;
/**
 * Does every term appear somewhere in this option?
 *
 * AND across space-separated terms, each matched against the whole
 * `group label value` string. One term over a concatenation would make word
 * order matter, and nobody can guess the author's order.
 */
export function matchesQuery(option, query) {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t !== '');
    if (terms.length === 0)
        return true;
    const hay = `${option.group ?? ''} ${option.label ?? ''} ${option.value}`
        .toLowerCase();
    return terms.every((t) => hay.includes(t));
}
/** The distinct groups, in first-seen order — the content's order, not the alphabet's. */
export function groupsOf(options) {
    const seen = [];
    for (const o of options) {
        const gname = o.group ?? '';
        if (gname !== '' && !seen.includes(gname))
            seen.push(gname);
    }
    return seen;
}
export function picker3d(config) {
    let options = config.options.map(normalise);
    let value = config.value ?? '';
    let host = null;
    let open = null;
    let width = 0;
    let rowHeight = 0;
    const change = handlerOf(config, 'handleChange', 'onChange');
    const H = Math.round(w3dTheme.fontSize * 2.2);
    const PAD = Math.max(6, Math.round(w3dTheme.spacing * 0.6));
    const el = g({ 'data-w3d': 'picker' });
    const bg = rect({ x: 0, y: 0, height: H, rx: 6, fill: w3dTheme.rowBg });
    const caption = text({
        x: PAD,
        y: H / 2,
        'dominant-baseline': 'middle',
        'font-family': w3dTheme.fontFamily,
        'font-size': String(w3dTheme.fontSize),
        fill: w3dTheme.muted,
    });
    const shown = text({
        y: H / 2,
        'dominant-baseline': 'middle',
        'text-anchor': 'end',
        'font-family': w3dTheme.fontFamily,
        'font-size': String(w3dTheme.fontSize),
        fill: w3dTheme.text,
    });
    const chevron = g({ 'data-picker-chevron': '' });
    el.appendChild(bg);
    el.appendChild(caption);
    el.appendChild(shown);
    el.appendChild(chevron);
    const labelOf = (v) => {
        const found = options.find((o) => o.value === v);
        if (found == null)
            return v;
        return found.label ?? found.value;
    };
    const paint = () => {
        caption.textContent = config.label ?? '';
        const empty = value === '';
        shown.textContent = empty ? config.placeholder ?? 'choose…' : labelOf(value);
        shown.setAttribute('fill', empty ? w3dTheme.muted : w3dTheme.text);
        while (chevron.firstChild)
            chevron.removeChild(chevron.firstChild);
        chevron.appendChild(iconGlyph('chevron90r', {
            color: w3dTheme.muted,
            size: 14,
            x: Math.max(0, width - PAD - 14),
            y: Math.round((H - 14) / 2),
        }));
        shown.setAttribute('x', String(Math.max(0, width - PAD - 20)));
    };
    const rowsFor = (group) => options
        .filter((o) => group === ALL_GROUPS || (o.group ?? '') === group)
        .map((o) => ({
        id: o.value,
        name: o.label ?? o.value,
        group: o.group ?? '',
    }));
    const openPopup = () => {
        if (host == null || open != null)
            return;
        const names = groupsOf(options);
        const wantFilter = config.filter === 'on' ||
            (config.filter !== 'off' && options.length > (config.filterAbove ?? 12));
        const wantGroups = config.groups === 'on' || (config.groups !== 'off' && names.length > 1);
        let group = ALL_GROUPS;
        let query = '';
        /*
        A LAYER IF THERE IS ONE, a bounded popup if not.
    
        A five-hundred-row list is bigger than most panels and `showPopup` caps to
        the panel's bounds, so on a short panel it produces a list squeezed to
        nothing over the control it belongs to. Ask for the layer; size to what is
        actually available when refused.
        */
        /*
        HOW MUCH ROOM THERE IS, measured on BOTH sides.
    
        Two wrong versions preceded this one, and the second is the instructive one:
    
        - `bounds.height - top` measures only the space UNDERNEATH, so a picker near
          the bottom of a panel got almost none — the popup came out two rows tall
          with its filter field pushed off the top. But `placePopup` FLIPS, so the
          space above counts too.
        - `bounds.height` — the whole panel — is too greedy the other way. A popup
          as tall as its panel fits neither above nor below a control INSIDE that
          panel, so flipping does not help and it lands clipped. Measured: a 420-tall
          popup on a 420-tall panel showed two rows.
    
        So: the better of the two sides, and never more than a screenful.
    
        ⚠️ With a LAYER the real constraint is the CONTAINER's height, which
        `WidgetHost` does not expose — `bounds` is the panel's. So the layer case
        asks for a sensible fixed size rather than pretending to measure something
        it cannot see. If a picker ever comes out clipped inside a short container,
        that gap is why.
        */
        const below = host.bounds.height - host.top - H - PAD * 2;
        const above = host.top - PAD * 2;
        const room = Math.max(below, above);
        const available = host.hasLayer
            ? Math.max(240, Math.min(360, room))
            : Math.max(90, room);
        const chrome = (wantFilter ? H + PAD : 0) + (wantGroups ? H + PAD : 0);
        const bodyHeight = Math.max(60, available - chrome - 30);
        const list = table({
            rows: rowsFor(group),
            columns: wantGroups
                ? [{ key: 'name', flex: 1 }]
                : [
                    { key: 'group', width: 92 },
                    { key: 'name', flex: 1 },
                ],
            height: bodyHeight,
            selection: 'single',
            handleActivate: (row) => {
                pick(String(row.id));
            },
            handleSelect: (ids) => {
                if (ids.length > 0)
                    pick(ids[0]);
            },
        });
        const apply = () => {
            list.setRows(rowsFor(group));
            list.setFilter(query === ''
                ? null
                : (row) => matchesQuery({
                    value: String(row.id),
                    label: String(row.name ?? ''),
                    group: String(row.group ?? ''),
                }, query));
        };
        const items = [];
        if (wantGroups) {
            items.push(select3d({
                label: 'family',
                value: ALL_GROUPS,
                options: [
                    { label: `all (${options.length})`, value: ALL_GROUPS },
                    ...names.map((n) => ({ label: n, value: n })),
                ],
                handleChange: (v) => {
                    group = String(v);
                    apply();
                },
            }));
        }
        if (wantFilter) {
            items.push(inputField({
                value: '',
                placeholder: 'filter…',
                handleChange: (v) => {
                    query = v;
                    apply();
                },
            }));
        }
        items.push(list);
        const anchor = { x: 0, y: 0, width, height: H };
        const openIt = host.hasLayer ? host.showLayer : host.showPopup;
        open = openIt.call(host, {
            anchor,
            width: Math.max(width, 240),
            maxHeight: available,
            handleClose: () => {
                open = null;
            },
        }, ...items);
    };
    const pick = (next) => {
        value = next;
        paint();
        open?.close();
        open = null;
        change?.(value);
    };
    const api = {
        el,
        get value() {
            return value;
        },
        setValue(next) {
            value = next;
            paint();
        },
        setOptions(next) {
            options = next.map(normalise);
            paint();
        },
        open: openPopup,
        setHost(h) {
            host = h;
        },
        layout(w) {
            width = w;
            bg.setAttribute('width', String(w));
            paint();
            rowHeight = H + PAD;
            return rowHeight;
        },
        hitTest(_x, y) {
            return y >= 0 && y <= H;
        },
        handle(kind, _x, y) {
            // On RELEASE, not press: a press that turns into a scroll of the panel
            // must not leave a popup open behind it.
            if (kind === 'up' && y >= 0 && y <= H)
                openPopup();
        },
    };
    paint();
    return api;
}
//# sourceMappingURL=picker.js.map