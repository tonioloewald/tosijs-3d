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
label or text just above it. An interactive control with no name, or two with
the same path, is what `nameProblems` reports: icons first, but never
nameless.

Pure: no DOM, no Babylon. The widgets implement `semantics()`; this module
only reads it.
*/
/*{ "parent": "widgets3d", "order": 90 }*/

/** What kind of control a widget is. */
export type WidgetRole =
  | 'button'
  | 'toggle'
  | 'slider'
  | 'select'
  | 'textbox'
  | 'colour'
  | 'vector'
  | 'list'
  | 'option'
  | 'tabs'
  | 'toolbar'
  | 'section'
  | 'popup'
  | 'group'
  | 'label'
  | 'text'
  | 'progress'
  | 'editor'

/** What a widget says about itself (`Widget3d.semantics()`). */
export interface WidgetSemantics {
  role: WidgetRole
  /** The accessible name: its label, tooltip or title. '' for none. */
  name: string
  /** What it shows now. */
  value?: unknown
  /** A select's or a tab strip's choices, by label. */
  options?: string[]
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  /** A section: whether it is open. */
  open?: boolean
  /** A text box's hint, used for its name when nothing else names it. */
  placeholder?: string
  /** Set the value through the widget's own setter, as a hand would. */
  set?(value: unknown): void
  /** Press it (a button, a section header, a list item). */
  activate?(): void
  /** Controls inside it (a row, a toolbar, a list). */
  children?: SemanticSource[]
}

/** Anything that may describe itself: every `Widget3d`. */
export interface SemanticSource {
  semantics?(): WidgetSemantics
  /** Present on widgets that take a pointer: unnamed ones are a problem. */
  handle?: unknown
}

/** One node of a panel's control tree. */
export interface ControlNode {
  role: WidgetRole | 'unknown'
  name: string
  /** Names from the top, joined by `/`. */
  path: string
  value?: unknown
  options?: string[]
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  open?: boolean
  /** Can it be set or pressed? */
  interactive: boolean
  set?(value: unknown): void
  activate?(): void
  children?: ControlNode[]
}

const CONTAINERS = new Set<WidgetRole>(['group', 'toolbar', 'list', 'popup'])
const NAMING = new Set<WidgetRole | 'unknown'>(['label', 'text'])

/** The widget's semantics, or an `unknown` node for one that has none. */
function describe(w: SemanticSource): WidgetSemantics | null {
  try {
    return w.semantics?.() ?? null
  } catch {
    return null
  }
}

/**
 * The control tree of a list of widgets (a panel's rows). Sections own the
 * rows after them, up to the next section; a row of widgets is flattened
 * into its level (it is layout, not meaning) and lends its label to an
 * unnamed control beside it.
 */
export function controlTree(
  widgets: SemanticSource[],
  prefix = ''
): ControlNode[] {
  const top: ControlNode[] = []
  let level = top
  let levelPath = prefix
  let previousText = ''
  const pathOf = (base: string, name: string) =>
    base === '' ? name : `${base}/${name}`

  const add = (
    w: SemanticSource,
    into: ControlNode[],
    base: string,
    rowLabel: string
  ): ControlNode | null => {
    const s = describe(w)
    if (s == null) {
      const node: ControlNode = {
        role: 'unknown',
        name: '',
        path: pathOf(base, ''),
        interactive: w.handle != null,
      }
      into.push(node)
      return node
    }
    if (s.role === 'group' && s.children) {
      // A row: flattened, and its label names an unnamed control beside it.
      let label = ''
      for (const c of s.children) {
        const n = add(c, into, base, label)
        if (n != null && NAMING.has(n.role) && n.name !== '') label = n.name
      }
      return null
    }
    let name = s.name
    if (name === '' && !NAMING.has(s.role))
      name = rowLabel || s.placeholder || previousText || ''
    const node: ControlNode = {
      role: s.role,
      name,
      path: pathOf(base, name),
      interactive: s.set != null || s.activate != null,
    }
    if (s.value !== undefined) node.value = s.value
    if (s.options) node.options = s.options
    if (s.min !== undefined) node.min = s.min
    if (s.max !== undefined) node.max = s.max
    if (s.step !== undefined) node.step = s.step
    if (s.disabled) node.disabled = true
    if (s.open !== undefined) node.open = s.open
    if (s.set) node.set = s.set
    if (s.activate) node.activate = s.activate
    if (CONTAINERS.has(s.role) && s.children) {
      node.children =
        s.role === 'popup'
          ? controlTree(s.children, node.path)
          : s.children.flatMap((c) => {
              const out: ControlNode[] = []
              add(c, out, node.path, '')
              return out
            })
    }
    into.push(node)
    return node
  }

  for (const w of widgets) {
    const s = describe(w)
    if (s?.role === 'section') {
      const node: ControlNode = {
        role: 'section',
        name: s.name,
        path: pathOf(prefix, s.name),
        interactive: s.activate != null,
        open: s.open,
        children: [],
      }
      if (s.activate) node.activate = s.activate
      top.push(node)
      level = node.children!
      levelPath = node.path
      previousText = ''
      continue
    }
    const node = add(w, level, levelPath, '')
    if (node != null && NAMING.has(node.role)) {
      previousText = node.role === 'label' ? node.name : String(node.value ?? '')
    } else if (node != null) previousText = ''
  }
  return top
}

/** Every node, depth first. */
export function walkControls(tree: ControlNode[]): ControlNode[] {
  const out: ControlNode[] = []
  const walk = (ns: ControlNode[]) => {
    for (const n of ns) {
      out.push(n)
      if (n.children) walk(n.children)
    }
  }
  walk(tree)
  return out
}

/**
 * The control at `path` (names joined by `/`). Refuses, with a reason, a path
 * that names nothing or more than one control: an agent is told, never guessed for.
 */
export function findControl(
  tree: ControlNode[],
  path: string
): { node: ControlNode } | { error: string } {
  const all = walkControls(tree)
  // A popup's own node only names a level; its opener is the control.
  let hits = all.filter(
    (n) => n.path === path && n.role !== 'unknown' && n.role !== 'popup'
  )
  // A label shares its path with the control it names: the control wins.
  if (hits.length > 1 && hits.some((n) => n.interactive))
    hits = hits.filter((n) => n.interactive)
  if (hits.length === 1) return { node: hits[0] }
  if (hits.length > 1)
    return { error: `"${path}" names ${hits.length} controls; it is ambiguous` }
  // By its own name alone, when that is unique on the panel.
  const leaf = path.split('/').pop() ?? path
  const byName = all.filter((n) => n.name === leaf && n.interactive)
  if (byName.length === 1) return { node: byName[0] }
  const near = all
    .filter((n) => n.interactive && n.name !== '')
    .map((n) => n.path)
    .slice(0, 40)
  return {
    error:
      byName.length > 1
        ? `"${path}" is ambiguous: ${byName.map((n) => n.path).join(', ')}`
        : `no control "${path}". Controls: ${near.join(', ')}`,
  }
}

/** Interactive controls with no name, and paths shared by more than one control. */
export function nameProblems(tree: ControlNode[]): string[] {
  const problems: string[] = []
  const seen = new Map<string, number>()
  for (const n of walkControls(tree)) {
    if (!n.interactive) continue
    if (n.role === 'unknown') {
      problems.push(`a control under "${parentOf(n.path)}" has no semantics()`)
      continue
    }
    if (n.name === '') {
      problems.push(`a ${n.role} under "${parentOf(n.path)}" has no name`)
      continue
    }
    seen.set(n.path, (seen.get(n.path) ?? 0) + 1)
  }
  for (const [path, count] of seen)
    if (count > 1) problems.push(`${count} controls share the path "${path}"`)
  return problems
}

const parentOf = (path: string) => {
  const i = path.lastIndexOf('/')
  return i < 0 ? '(top)' : path.slice(0, i)
}

/**
 * A plain, serialisable copy of a tree (no functions), for a tool's answer.
 * Closed sections list no children; `depth` cuts deeper levels.
 */
export function plainControls(
  tree: ControlNode[],
  depth = Infinity
): Array<Record<string, unknown>> {
  return tree.map((n) => {
    const o: Record<string, unknown> = { role: n.role, name: n.name, path: n.path }
    for (const k of [
      'value',
      'options',
      'min',
      'max',
      'step',
      'disabled',
      'open',
    ] as const)
      if (n[k] !== undefined) o[k] = n[k]
    if (n.interactive) o.interactive = true
    if (n.children && n.children.length > 0 && depth > 1)
      o.children = plainControls(n.children, depth - 1)
    return o
  })
}
