/*#
# aria mirror

**A panel a screen reader can use.** A panel draws in SVG, flat or on a plane
in the scene, and a screen reader sees none of it. The mirror is the same
panel as real HTML controls (buttons, checkboxes, range inputs, selects, text
fields), visually hidden, built from the panel's control tree (see
[widget semantics](/widget-semantics/)). Sections are headings with an
expand button, popups are dialogs. Using a mirrored control sets or presses
the panel's own widget through its own path, exactly as an agent's tool or a
hand on it would, so there is one definition of what each control does.

**Placed over what it mirrors.** With `place`, each copy is a real target
laid exactly over its drawn control: unpainted (no background, no text
colour) but fully opaque and, where the main pointer is a finger, taking
touches (with a mouse every press goes through to the drawn panel), because iOS VoiceOver finds what
a finger is on by hit-testing, and skipped transparent, untouchable copies
for the canvas under them. So a person exploring by touch finds "Continue"
where Continue is drawn, and a double-tap presses the copy. A copy with
keyboard focus shows a ring over the drawn control. Without `place` the
copies are hidden in a corner and reached by swiping or Tab.

**Built only when someone uses it.** `<tosi-b3d>` builds nothing for a
screen reader until focus first lands in the scene (Tab, or VoiceOver moving
onto the owl or the scene); from then it mirrors its settings panel and any
modal (a pause: focus moves to Continue), describes the scene and names the
glass gamepad's controls. Values are read again when a copy takes focus;
nothing runs on a timer. Its system bar's buttons are real HTML buttons
already, laid exactly over the drawn bar.

```javascript
import { ariaMirror } from 'tosijs-3d/aria-mirror'
const mirror = ariaMirror(hostElement, () => panel.controls(), { label: 'Settings' })
mirror.update()   // after the panel rebuilds; values patch in place, focus stays
mirror.dispose()
```

What it cannot do yet: a big editor (a curve, a footprint) is read out by name
and value only, unless its value is a few numbers, which become number fields.
In a headset there is no DOM to mirror into.
*/
/*{ "parent": "widget-semantics", "order": 10 }*/

import type { ControlBox, ControlNode } from './widget-semantics.js'

export interface AriaMirrorOptions {
  /** The region's accessible name (the panel's title). */
  label?: string | (() => string)
  /**
   * Where a control's box (panel units) is on the host, in CSS pixels: the
   * copy then sits over the drawn control, unpainted and (on a touch-first
   * device) taking touches, so a finger exploring the screen with a screen
   * reader finds it there. Null, or
   * no `place`, keeps it hidden in the corner.
   */
  place?: (box: ControlBox) => ControlBox | null
  /** `dialog` for a modal (a pause, a respawn): marked modal. Default `region`. */
  role?: 'region' | 'dialog'
}

export interface AriaMirror {
  /** The element the controls are in. */
  readonly root: HTMLElement
  /** Re-read the tree: values patch in place, a changed structure rebuilds (focus kept by path). */
  update(): void
  /** Empty it (the panel closed). */
  clear(): void
  dispose(): void
}

/** Visually hidden, still in the accessibility tree and focusable. */
export const VISUALLY_HIDDEN: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
}

/**
A placed copy: a real, opaque, touchable box with nothing painted. Not
`opacity: 0` and not `pointer-events: none`: iOS VoiceOver finds what is under
a finger by hit-testing, and passed over such copies for the canvas. A range
input's thumb is a pseudo-element, which an inline style cannot reach: the
host's stylesheet hides it (`<tosi-b3d>` does).
*/
export const UNPAINTED: Partial<CSSStyleDeclaration> = {
  background: 'transparent',
  color: 'transparent',
  caretColor: 'transparent',
  border: '0',
  appearance: 'none',
  webkitAppearance: 'none',
  font: 'inherit',
}

/**
Whether the main pointer is a finger. Only touch exploration needs a copy to
take touches (it hit-tests); with a mouse the copies let every press through
to the drawn panel, and a desktop screen reader moves by keyboard.
*/
const fingerFirst = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

/** A number without float noise: 0.6000000238418579 is 0.6. */
const tidy = (x: number) => String(Number(x.toPrecision(6)))

const numeric = (v: unknown): v is Record<string, number> =>
  v != null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(v).length > 0 &&
  Object.keys(v).length <= 6 &&
  Object.values(v).every((x) => typeof x === 'number')

/** A value as a person would read it. */
function spoken(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(Math.round(v * 1000) / 1000)
  if (Array.isArray(v)) {
    // A curve's points: the first few, then how many more.
    const head = v
      .slice(0, 8)
      .map(spoken)
      .filter((s) => s !== '')
    const more = v.length > 8 ? `; and ${v.length - 8} more` : ''
    return `${v.length} points: ${head.join('; ')}${more}`
  }
  if (typeof v === 'object') {
    if (numeric(v))
      return Object.entries(v)
        .map(([k, n]) => `${k} ${spoken(n)}`)
        .join(', ')
    return ''
  }
  return String(v)
}

/** Structure only: what a value patch cannot change. */
function shape(tree: ControlNode[]): string {
  const parts: string[] = []
  const walk = (ns: ControlNode[]) => {
    for (const n of ns) {
      parts.push(
        `${n.role}|${n.path}|${n.disabled ? 1 : 0}|${n.open ?? ''}|${
          n.options?.join('\u0001') ?? ''
        }|${numeric(n.value) ? Object.keys(n.value).join(',') : ''}|${
          n.interactive ? 1 : 0
        }`
      )
      if (n.children) {
        parts.push('(')
        walk(n.children)
        parts.push(')')
      }
    }
  }
  walk(tree)
  return parts.join('\n')
}

export function ariaMirror(
  host: HTMLElement,
  read: () => ControlNode[] | null,
  options: AriaMirrorOptions = {}
): AriaMirror {
  const doc = host.ownerDocument
  const root = doc.createElement('div')
  root.setAttribute('role', options.role ?? 'region')
  if (options.role === 'dialog') root.setAttribute('aria-modal', 'true')
  root.dataset.ariaMirror = ''
  // Placing: an overlay of the host that only its placed copies make
  // touchable (see UNPAINTED). Else hidden.
  Object.assign(
    root.style,
    options.place
      ? {
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          overflow: 'hidden',
        }
      : VISUALLY_HIDDEN
  )
  host.appendChild(root)
  // Values are read again when a control takes focus: when someone is about
  // to hear them. Nothing runs between.
  root.addEventListener('focusin', () => update())

  /** The current node behind each control, by key: handlers look it up when they fire. */
  let nodes = new Map<string, ControlNode>()
  /** Patch functions, by key, for a value-only update. */
  let patches = new Map<string, (n: ControlNode) => void>()
  let lastShape = ''

  const label = () =>
    typeof options.label === 'function' ? options.label() : options.label ?? ''

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string> = {},
    text?: string
  ): HTMLElementTagNameMap[K] => {
    const e = doc.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (text != null) e.textContent = text
    return e
  }
  const node = (key: string) => nodes.get(key)
  /** Text that reads in order but is nowhere on screen: in the corner. */
  const quiet = <E extends HTMLElement>(e: E): E => {
    if (options.place) Object.assign(e.style, VISUALLY_HIDDEN)
    return e
  }
  const focused = (): Element | null => {
    const r = root.getRootNode() as Document | ShadowRoot
    return r.activeElement ?? null
  }

  /** Each placed control's element, by key, so an update can move it. */
  let placed = new Map<string, HTMLElement>()
  function position(e: HTMLElement, n: ControlNode): void {
    if (options.place == null) return
    const at = n.box ? options.place(n.box) : null
    if (at == null) {
      Object.assign(e.style, VISUALLY_HIDDEN, {
        left: '',
        top: '',
        pointerEvents: '',
      })
      return
    }
    Object.assign(e.style, UNPAINTED, {
      pointerEvents: fingerFirst() ? 'auto' : 'none',
      position: 'absolute',
      left: `${at.x}px`,
      top: `${at.y}px`,
      width: `${at.w}px`,
      height: `${at.h}px`,
      margin: '0',
      padding: '0',
      boxSizing: 'border-box',
      overflow: 'hidden',
      clipPath: '',
      whiteSpace: '',
    })
  }

  function render(n: ControlNode, key: string, into: HTMLElement): void {
    nodes.set(key, n)
    const put = (e: HTMLElement) => {
      into.appendChild(e)
      placed.set(key, e)
      position(e, n)
    }
    const name = n.name || n.role
    const disabled = (e: HTMLElement) => {
      if (n.disabled) e.setAttribute('disabled', '')
    }
    const keyed = <E extends HTMLElement>(e: E): E => {
      e.dataset.key = key
      return e
    }
    switch (n.role) {
      case 'section': {
        const h = el('h3')
        const b = keyed(
          el(
            'button',
            { type: 'button', 'aria-expanded': String(!!n.open) },
            name
          )
        )
        b.addEventListener('click', () => node(key)?.activate?.())
        h.appendChild(b)
        put(h)
        if (n.open && n.children) {
          const g = el('div', { role: 'group', 'aria-label': name })
          renderAll(n.children, g)
          into.appendChild(g)
        }
        return
      }
      case 'button': {
        const b = keyed(el('button', { type: 'button' }, name))
        if (n.value === true) b.setAttribute('aria-pressed', 'true')
        disabled(b)
        b.addEventListener('click', () => node(key)?.activate?.())
        put(b)
        patches.set(key, (m) => {
          if (m.value === true) b.setAttribute('aria-pressed', 'true')
          else b.removeAttribute('aria-pressed')
        })
        if (n.options && n.set) {
          const g = el('div', { role: 'group', 'aria-label': `${name} menu` })
          n.options.forEach((o) => {
            const ob = el('button', { type: 'button' }, o)
            ob.addEventListener('click', () => node(key)?.set?.(o))
            g.appendChild(ob)
          })
          into.appendChild(g)
        }
        return
      }
      case 'toggle': {
        const lab = el('label')
        const c = keyed(el('input', { type: 'checkbox', role: 'switch' }))
        c.checked = !!n.value
        disabled(c)
        c.addEventListener('change', () => node(key)?.set?.(c.checked))
        lab.append(c, ` ${name}`)
        put(lab)
        patches.set(key, (m) => (c.checked = !!m.value))
        return
      }
      case 'slider': {
        const r = keyed(el('input', { type: 'range', 'aria-label': name }))
        // A log track is mirrored as positions along it (0..1000), so an
        // arrow moves the handle as far as a hand would; the text says the value.
        const track = n.setFraction != null
        const position = (m: ControlNode) =>
          track
            ? String(Math.round((m.fraction ?? 0) * 1000))
            : String(m.value ?? '')
        if (track) {
          r.min = '0'
          r.max = '1000'
          r.step = '10'
        } else {
          if (n.min !== undefined) r.min = tidy(n.min)
          if (n.max !== undefined) r.max = tidy(n.max)
          r.step = n.step !== undefined && n.step > 0 ? tidy(n.step) : 'any'
        }
        r.value = position(n)
        const text = (m: ControlNode) => {
          if (m.valueText) r.setAttribute('aria-valuetext', m.valueText)
          else r.removeAttribute('aria-valuetext')
        }
        text(n)
        disabled(r)
        r.addEventListener('input', () => {
          const cur = node(key)
          if (track) cur?.setFraction?.(Number(r.value) / 1000)
          else cur?.set?.(Number(r.value))
          // What the widget now shows (its formatted value), read back.
          queueMicrotask(update)
        })
        put(r)
        patches.set(key, (m) => {
          if (focused() !== r) r.value = position(m)
          text(m)
        })
        return
      }
      case 'select':
      case 'tabs': {
        const s = keyed(el('select', { 'aria-label': name }))
        for (const o of n.options ?? []) s.appendChild(el('option', {}, o))
        s.value = String(n.value ?? '')
        disabled(s)
        s.addEventListener('change', () => node(key)?.set?.(s.value))
        put(s)
        patches.set(key, (m) => (s.value = String(m.value ?? '')))
        return
      }
      case 'textbox':
      case 'colour': {
        const t = keyed(el('input', { type: 'text', 'aria-label': name }))
        t.value = String(n.value ?? '')
        disabled(t)
        if (!n.set) t.readOnly = true
        t.addEventListener('change', () => node(key)?.set?.(t.value))
        put(t)
        patches.set(key, (m) => {
          if (focused() !== t) t.value = String(m.value ?? '')
        })
        return
      }
      case 'vector':
      case 'editor': {
        const g = el('div', { role: 'group', 'aria-label': name })
        if (numeric(n.value) && n.set) {
          const fields: Record<string, HTMLInputElement> = {}
          for (const [k, v] of Object.entries(n.value)) {
            const f = keyed(
              el('input', {
                type: 'number',
                step: 'any',
                'aria-label': `${name} ${k}`,
              })
            )
            f.dataset.key = `${key}#${k}`
            f.value = String(v)
            disabled(f)
            f.addEventListener('change', () => {
              const cur = node(key)
              const x = Number(f.value)
              if (cur?.set && numeric(cur.value) && Number.isFinite(x))
                cur.set({ ...cur.value, [k]: x })
            })
            fields[k] = f
            g.appendChild(f)
          }
          patches.set(key, (m) => {
            if (!numeric(m.value)) return
            for (const [k, f] of Object.entries(fields))
              if (focused() !== f) f.value = String(m.value[k] ?? '')
          })
        } else {
          const p = el('p', {}, `${name}: ${spoken(n.value)}`)
          g.appendChild(p)
          patches.set(
            key,
            (m) => (p.textContent = `${name}: ${spoken(m.value)}`)
          )
          // An editor with presets: the one edit a list of options can make.
          if (n.options && n.set) {
            const s = keyed(el('select', { 'aria-label': `${name} preset` }))
            s.dataset.key = `${key}#preset`
            s.appendChild(el('option', { value: '' }, 'choose a preset'))
            for (const o of n.options) s.appendChild(el('option', {}, o))
            disabled(s)
            s.addEventListener('change', () => {
              if (s.value !== '') node(key)?.set?.(s.value)
            })
            g.appendChild(s)
          }
        }
        put(g)
        return
      }
      case 'list':
      case 'toolbar':
      case 'group':
      case 'popup': {
        const role =
          n.role === 'popup'
            ? 'dialog'
            : n.role === 'toolbar'
            ? 'toolbar'
            : 'group'
        // A toolbar with no name of its own is the panel's tools.
        const label = n.name || (n.role === 'toolbar' ? 'tools' : '')
        const g = el('div', { role, ...(label ? { 'aria-label': label } : {}) })
        renderAll(n.children ?? [], g)
        into.appendChild(g)
        return
      }
      case 'option': {
        const b = keyed(el('button', { type: 'button' }, name))
        disabled(b)
        b.addEventListener('click', () => node(key)?.activate?.())
        put(b)
        return
      }
      case 'progress': {
        const p = el('div', { role: 'progressbar', 'aria-label': name })
        const set = (v: unknown) =>
          typeof v === 'number'
            ? p.setAttribute('aria-valuenow', String(v))
            : p.removeAttribute('aria-valuenow')
        set(n.value)
        put(p)
        patches.set(key, (m) => set(m.value))
        return
      }
      case 'label': {
        if (n.name) into.appendChild(quiet(el('p', {}, n.name)))
        return
      }
      case 'text': {
        const p = quiet(el('p', {}, spoken(n.value)))
        into.appendChild(p)
        patches.set(key, (m) => (p.textContent = spoken(m.value)))
        return
      }
      default:
        // `unknown`: a widget with no semantics() has nothing to say.
        return
    }
  }

  function renderAll(ns: ControlNode[], into: HTMLElement): void {
    const seen = new Map<string, number>()
    for (const n of ns) {
      const k = `${n.role}:${n.path}`
      const count = (seen.get(k) ?? 0) + 1
      seen.set(k, count)
      render(n, count > 1 ? `${k}#${count}` : k, into)
    }
  }

  /** Walk a fresh tree with the same keying as `renderAll`, for a patch. */
  function patchAll(ns: ControlNode[]): void {
    const seen = new Map<string, number>()
    for (const n of ns) {
      const k = `${n.role}:${n.path}`
      const count = (seen.get(k) ?? 0) + 1
      seen.set(k, count)
      const key = count > 1 ? `${k}#${count}` : k
      nodes.set(key, n)
      patches.get(key)?.(n)
      const e = placed.get(key)
      if (e != null) position(e, n)
      if (n.children) patchAll(n.children)
    }
  }

  function clear(): void {
    root.replaceChildren()
    nodes = new Map()
    patches = new Map()
    placed = new Map()
    lastShape = ''
  }

  function update(): void {
    let tree: ControlNode[] | null
    try {
      tree = read()
    } catch {
      tree = null
    }
    if (tree == null) return clear()
    const name = label()
    if (name) root.setAttribute('aria-label', name)
    else root.removeAttribute('aria-label')
    const s = shape(tree)
    if (s === lastShape) return patchAll(tree)
    // Rebuild, and put focus back on the control that had it.
    const had = focused()
    const inside = had != null && root.contains(had)
    const hadKey = inside ? (had as HTMLElement).dataset.key : null
    const before = [...root.querySelectorAll<HTMLElement>('[data-key]')]
    const hadIndex = inside ? before.indexOf(had as HTMLElement) : -1
    root.replaceChildren()
    nodes = new Map()
    patches = new Map()
    placed = new Map()
    renderAll(tree, root)
    lastShape = s
    if (!inside) return
    /*
    Focus goes back to the same control, or, when that control is gone (Pause
    became Resume), to the one now in its place: a reader dropped to the top
    of the page has to find their way back from nothing.
    */
    const after = [...root.querySelectorAll<HTMLElement>('[data-key]')]
    const same = after.find((e) => e.dataset.key === hadKey)
    const near = after[Math.min(Math.max(0, hadIndex), after.length - 1)]
    ;(same ?? near)?.focus()
  }

  return {
    root,
    update,
    clear,
    dispose() {
      clear()
      root.remove()
    },
  }
}
