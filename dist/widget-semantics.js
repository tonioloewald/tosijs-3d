/*#
# widget semantics

**What a panel control IS, as well as how it draws.** Every `Widget3d` may
say what it is through `semantics()`: a role (button, toggle, slider,
select, text box, …), its accessible NAME, its value, and how to set or
press it through its own path, exactly as a hand on it would. A panel's
widgets then read as a tree of named controls, which is what an agent's
tools, a screen reader's mirror and the panel name test all read.

```javascript
import { controlTree, findControl, nameProblems } from 'tosijs-3d/widget-semantics'
const tree = panel.controls()               // a Panel3d's rows, header and open popups
findControl(tree, 'Sky/time of day').node.set(18)
findControl(tree, 'Character/save…').node.activate()
nameProblems(tree)                          // [] when every control has a unique name
```

A control is addressed by its PATH: the names of the sections and groups
above it and its own, joined by `/`. Sections (`label3d({ collapsible })`)
are levels, and a closed section still lists its name (activate it to open
it, then read the tree again). A popup that is open is a level named after
the control that opened it.

**Names.** A control's own label first. A control with none (an input field)
takes the label beside it in the same row, then its placeholder, then the
label or text just above it. An interactive control with no name, one named
only by a glyph (`⋯`), or two with the same path, is what `nameProblems` reports: icons first, but never
nameless.

Pure: no DOM, no Babylon. The widgets implement `semantics()`; this module
only reads it.
*/
/*{ "parent": "widgets3d", "order": 90 }*/
const CONTAINERS = new Set(['group', 'toolbar', 'list', 'popup']);
const NAMING = new Set(['label', 'text']);
/** The widget's semantics, or an `unknown` node for one that has none. */
function describe(w) {
    try {
        return w.semantics?.() ?? null;
    }
    catch {
        return null;
    }
}
/**
 * The control tree of a list of widgets (a panel's rows). Sections own the
 * rows after them, up to the next section; a row of widgets is flattened
 * into its level (it is layout, not meaning) and lends its label to an
 * unnamed control beside it.
 */
export function controlTree(widgets, prefix = '', 
/** Where each top-level widget is drawn (a panel's row), when known. */
boxOf) {
    const top = [];
    let level = top;
    let levelPath = prefix;
    let previousText = '';
    const pathOf = (base, name) => base === '' ? name : `${base}/${name}`;
    /** The children's boxes: their own, else an even share (a list stacks). */
    const childBoxes = (children, parent, vertical, given) => {
        if (parent == null)
            return children.map(() => null);
        const n = children.length || 1;
        return children.map((c, i) => {
            const own = given?.[i] ?? describe(c)?.box;
            if (own != null)
                return {
                    x: parent.x + own.x,
                    y: parent.y + own.y,
                    // A full-width row says so with Infinity: the parent's width.
                    w: Math.min(own.w, parent.w - own.x),
                    h: own.h,
                };
            return vertical
                ? {
                    x: parent.x,
                    y: parent.y + (parent.h * i) / n,
                    w: parent.w,
                    h: parent.h / n,
                }
                : {
                    x: parent.x + (parent.w * i) / n,
                    y: parent.y,
                    w: parent.w / n,
                    h: parent.h,
                };
        });
    };
    const add = (w, into, base, rowLabel, box) => {
        const s = describe(w);
        if (s == null) {
            const node = {
                role: 'unknown',
                name: '',
                path: pathOf(base, ''),
                interactive: w.handle != null,
            };
            into.push(node);
            return node;
        }
        if (s.role === 'group' && s.children) {
            // A row: flattened, and its label names an unnamed control beside it.
            let label = '';
            const boxes = childBoxes(s.children, box, false, s.childBoxes);
            s.children.forEach((c, i) => {
                const n = add(c, into, base, label, boxes[i]);
                if (n != null && NAMING.has(n.role) && n.name !== '')
                    label = n.name;
            });
            return null;
        }
        let name = s.name;
        if (name === '' && !NAMING.has(s.role))
            name = rowLabel || s.placeholder || previousText || '';
        const node = {
            role: s.role,
            name,
            path: pathOf(base, name),
            interactive: s.set != null || s.activate != null,
        };
        if (s.value !== undefined)
            node.value = s.value;
        if (s.valueText !== undefined)
            node.valueText = s.valueText;
        if (s.fraction !== undefined)
            node.fraction = s.fraction;
        if (s.setFraction)
            node.setFraction = s.setFraction;
        if (s.options)
            node.options = s.options;
        if (s.min !== undefined)
            node.min = s.min;
        if (s.max !== undefined)
            node.max = s.max;
        if (s.step !== undefined)
            node.step = s.step;
        if (s.disabled)
            node.disabled = true;
        if (s.open !== undefined)
            node.open = s.open;
        if (s.set)
            node.set = s.set;
        if (s.activate)
            node.activate = s.activate;
        if (box != null)
            node.box = box;
        if (CONTAINERS.has(s.role) && s.children) {
            const boxes = childBoxes(s.children, box, s.role === 'list', s.childBoxes);
            node.children =
                s.role === 'popup'
                    ? controlTree(s.children, node.path)
                    : s.children.flatMap((c, i) => {
                        const out = [];
                        add(c, out, node.path, '', boxes[i]);
                        return out;
                    });
        }
        into.push(node);
        return node;
    };
    // The section a sub-section (level 2) belongs to.
    let parent = null;
    for (const w of widgets) {
        const s = describe(w);
        if (s?.role === 'section') {
            const sub = s.level === 2 && parent != null;
            const node = {
                role: 'section',
                name: s.name,
                path: pathOf(sub ? parent.path : prefix, s.name),
                interactive: s.activate != null,
                open: s.open,
                children: [],
            };
            if (s.activate)
                node.activate = s.activate;
            const b = boxOf?.(w);
            if (b != null)
                node.box = b;
            if (sub)
                parent.children.push(node);
            else {
                top.push(node);
                // Only a section proper owns sub-sections; one with nothing above it
                // (a tab's) is a sibling of the next.
                parent = s.level === 2 ? null : node;
            }
            level = node.children;
            levelPath = node.path;
            previousText = '';
            continue;
        }
        const node = add(w, level, levelPath, '', boxOf?.(w));
        if (node != null && NAMING.has(node.role)) {
            previousText =
                node.role === 'label' ? node.name : String(node.value ?? '');
        }
        else if (node != null)
            previousText = '';
    }
    return top;
}
/** Every node, depth first. */
export function walkControls(tree) {
    const out = [];
    const walk = (ns) => {
        for (const n of ns) {
            out.push(n);
            if (n.children)
                walk(n.children);
        }
    };
    walk(tree);
    return out;
}
/**
 * The control at `path` (names joined by `/`). Refuses, with a reason, a path
 * that names nothing or more than one control: an agent is told, never guessed for.
 */
export function findControl(tree, path) {
    const all = walkControls(tree);
    // A popup's own node only names a level; its opener is the control.
    let hits = all.filter((n) => n.path === path && n.role !== 'unknown' && n.role !== 'popup');
    // A label shares its path with the control it names: the control wins.
    if (hits.length > 1 && hits.some((n) => n.interactive))
        hits = hits.filter((n) => n.interactive);
    if (hits.length === 1)
        return { node: hits[0] };
    if (hits.length > 1)
        return { error: `"${path}" names ${hits.length} controls; it is ambiguous` };
    // By its own name alone, when that is unique on the panel.
    const leaf = path.split('/').pop() ?? path;
    const byName = all.filter((n) => n.name === leaf && n.interactive);
    if (byName.length === 1)
        return { node: byName[0] };
    const near = all
        .filter((n) => n.interactive && n.name !== '')
        .map((n) => n.path)
        .slice(0, 40);
    return {
        error: byName.length > 1
            ? `"${path}" is ambiguous: ${byName.map((n) => n.path).join(', ')}`
            : `no control "${path}". Controls: ${near.join(', ')}`,
    };
}
/** Interactive controls with no name, and paths shared by more than one control. */
export function nameProblems(tree) {
    const problems = [];
    const seen = new Map();
    for (const n of walkControls(tree)) {
        if (!n.interactive)
            continue;
        if (n.role === 'unknown') {
            problems.push(`a control under "${parentOf(n.path)}" has no semantics()`);
            continue;
        }
        if (n.name === '') {
            problems.push(`a ${n.role} under "${parentOf(n.path)}" has no name`);
            continue;
        }
        // A glyph is a picture, not a name: "⋯" read aloud says nothing.
        if (!/[\p{L}\p{N}]/u.test(n.name))
            problems.push(`a ${n.role} under "${parentOf(n.path)}" is named only "${n.name}" (give it a title)`);
        seen.set(n.path, (seen.get(n.path) ?? 0) + 1);
    }
    for (const [path, count] of seen)
        if (count > 1)
            problems.push(`${count} controls share the path "${path}"`);
    return problems;
}
const parentOf = (path) => {
    const i = path.lastIndexOf('/');
    return i < 0 ? '(top)' : path.slice(0, i);
};
/**
 * A plain, serialisable copy of a tree (no functions), for a tool's answer.
 * Closed sections list no children; `depth` cuts deeper levels.
 */
export function plainControls(tree, depth = Infinity) {
    return tree.map((n) => {
        const o = {
            role: n.role,
            name: n.name,
            path: n.path,
        };
        for (const k of [
            'value',
            'valueText',
            'options',
            'min',
            'max',
            'step',
            'disabled',
            'open',
        ])
            if (n[k] !== undefined)
                o[k] = n[k];
        if (n.interactive)
            o.interactive = true;
        if (n.children && n.children.length > 0 && depth > 1)
            o.children = plainControls(n.children, depth - 1);
        return o;
    });
}
//# sourceMappingURL=widget-semantics.js.map