import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'
import {
  controlTree,
  findControl,
  nameProblems,
  plainControls,
} from './widget-semantics.js'

let W: typeof import('./widgets3d.js')
let K: typeof import('./keyboard.js')
let G: typeof import('./icon-grid.js')

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  W = await import('./widgets3d.js')
  K = await import('./keyboard.js')
  G = await import('./icon-grid.js')
})

const node = (tree: ReturnType<typeof controlTree>, path: string) => {
  const r = findControl(tree, path)
  if ('error' in r) throw new Error(r.error)
  return r.node
}

describe('the control tree', () => {
  test('sections own the rows after them; rows are flattened and lend their label', () => {
    let night = false
    const tree = controlTree([
      W.label3d({ text: 'Sky', collapsible: true, open: true }),
      W.toggle3d({
        label: 'night',
        value: false,
        handleChange: (v) => (night = v),
      }),
      W.row3d({}, W.label3d({ text: 'title' }), K.inputField({ value: 'x' })),
      W.label3d({ text: 'Scene', collapsible: true }),
      W.button3d({ label: 'reset' }),
    ])
    expect(tree.map((n) => n.path)).toEqual(['Sky', 'Scene'])
    expect(tree[0].children!.map((n) => n.path)).toEqual([
      'Sky/night',
      'Sky/title',
      'Sky/title',
    ])
    // The label and the field it names share the path; the field is the control.
    const field = node(tree, 'Sky/title')
    expect(field.role).toBe('textbox')
    node(tree, 'Sky/night').set!(true)
    expect(night).toBe(true)
    expect(nameProblems(tree)).toEqual([])
  })

  test('an unnamed control takes its placeholder, then the text above it', () => {
    const tree = controlTree([
      K.inputField({ placeholder: 'name' }),
      W.text3d({ text: 'motto' }),
      K.inputField({}),
    ])
    expect(tree.map((n) => n.path)).toEqual(['name', '', 'motto'])
  })

  test('nameless and duplicate controls are problems; labels and text are not', () => {
    const tree = controlTree([
      W.button3d({ label: 'go' }),
      W.button3d({ label: 'go' }),
      W.iconBar3d({ items: [{ icon: 'x' }] }),
      W.text3d({ text: 'just words' }),
    ])
    const problems = nameProblems(tree)
    expect(problems).toContain('2 controls share the path "go"')
    expect(problems.some((p) => /button .* has no name/.test(p))).toBe(true)
    expect(problems).toHaveLength(2)
  })

  test('a path that names nothing or two things is refused with a reason', () => {
    const tree = controlTree([
      W.button3d({ label: 'go' }),
      W.button3d({ label: 'go' }),
    ])
    const none = findControl(tree, 'stop')
    expect('error' in none && none.error).toMatch(/no control "stop"/)
    const two = findControl(tree, 'go')
    expect('error' in two && two.error).toMatch(/ambiguous/)
  })

  test('a control is found by its own name when that is unique', () => {
    const tree = controlTree([
      W.label3d({ text: 'Sky', collapsible: true, open: true }),
      W.slider3d({ label: 'time of day', value: 6, min: 0, max: 24 }),
    ])
    expect(node(tree, 'time of day').path).toBe('Sky/time of day')
  })

  test('plainControls drops functions and keeps what an agent reads', () => {
    const tree = controlTree([
      W.select3d({ label: 'world', value: 'mars', options: ['earth', 'mars'] }),
    ])
    expect(JSON.parse(JSON.stringify(plainControls(tree)))).toEqual([
      {
        role: 'select',
        name: 'world',
        path: 'world',
        value: 'mars',
        options: ['earth', 'mars'],
        interactive: true,
      },
    ])
  })
})

describe('widgets set and press through their own path', () => {
  test('slider: clamped and stepped, reported to handleChange', () => {
    const seen: number[] = []
    const s = W.slider3d({
      label: 'speed',
      value: 1,
      min: 0,
      max: 10,
      step: 0.5,
      handleChange: (v) => seen.push(v),
    })
    s.layout(300)
    const sem = s.semantics!()
    expect(sem).toMatchObject({
      role: 'slider',
      name: 'speed',
      value: 1,
      min: 0,
      max: 10,
      step: 0.5,
    })
    sem.set!(3.3)
    sem.set!(99)
    expect(seen).toEqual([3.5, 10])
    expect(s.semantics!().value).toBe(10)
  })

  test('select: by label or by value', () => {
    const seen: Array<string | number> = []
    const s = W.select3d({
      label: 'size',
      value: 1,
      options: [
        { label: 'small', value: 1 },
        { label: 'large', value: 2 },
      ],
      handleChange: (v) => seen.push(v),
    })
    s.semantics!().set!('large')
    s.semantics!().set!(1)
    s.semantics!().set!('huge')
    expect(seen).toEqual([2, 1])
    expect(s.semantics!().value).toBe('small')
  })

  test('toggle, button, menu button, tabs, list', () => {
    let on = false
    const t = W.toggle3d({
      label: 'lights',
      value: false,
      handleChange: (v) => (on = v),
    })
    t.semantics!().set!('on')
    expect(on).toBe(true)
    t.semantics!().set!(true) // already on: no flip
    expect(t.semantics!().value).toBe(true)

    let clicks = 0
    W.button3d({ label: 'go', handleClick: () => clicks++ }).semantics!()
      .activate!()
    expect(clicks).toBe(1)

    let picked = ''
    const m = W.button3d({
      label: 'file',
      menu: [
        { label: 'save', handleSelect: () => (picked = 'save') },
        {
          label: 'revert',
          disabled: true,
          handleSelect: () => (picked = 'revert'),
        },
      ],
    })
    expect(m.semantics!().options).toEqual(['save', 'revert'])
    m.semantics!().set!('revert')
    expect(picked).toBe('')
    m.semantics!().set!('save')
    expect(picked).toBe('save')

    let tab = -1
    const tabs = W.tabs3d({
      tabs: ['a', { icon: 'sun', title: 'sky' }],
      handleSelect: (i) => (tab = i),
    })
    tabs.layout(300)
    expect(tabs.semantics!().options).toEqual(['a', 'sky'])
    tabs.semantics!().set!('sky')
    expect(tab).toBe(1)

    let chose = ''
    const list = W.list3d({
      items: [{ label: 'yes' }, { label: 'no', disabled: true }],
      handleSelect: (it) => (chose = it.label),
    })
    const tree = controlTree([list])
    expect(tree[0].children!.map((n) => [n.name, !!n.disabled])).toEqual([
      ['yes', false],
      ['no', true],
    ])
    node(tree, 'no').activate!()
    expect(chose).toBe('')
    node(tree, 'yes').activate!()
    expect(chose).toBe('yes')
  })

  test('input field: set as typed, settled as Enter settles it', () => {
    const seen: string[] = []
    const f = K.inputField({
      type: 'number',
      value: '1',
      handleChange: (v) => seen.push(v),
    })
    f.semantics!().set!('2.')
    expect(f.value).toBe('2')
    expect(seen).toContain('2')
  })

  test('icon grid: cells are buttons, or toggles in a selecting grid', () => {
    const grid = G.iconGrid3d({
      mode: 'radio',
      items: [
        { icon: 'move', title: 'move' },
        { icon: 'rotate', title: 'rotate' },
      ],
      selected: 0,
    })
    const tree = controlTree([grid])
    expect(tree[0].children!.map((n) => [n.role, n.name, n.value])).toEqual([
      ['toggle', 'move', true],
      ['toggle', 'rotate', false],
    ])
    node(tree, 'rotate').activate!()
    expect(grid.selection).toEqual([1])
  })
})

describe('a panel lists its controls, and the popup open from one', () => {
  test('the popup form is a level named after its opener', async () => {
    let saved = ''
    let typed = ''
    const panel = W.panel3d(
      { width: 320 },
      W.button3d({
        label: 'save…',
        popup: (pop) => [
          W.text3d({ text: 'save as' }),
          K.inputField({
            placeholder: 'name',
            handleChange: (v) => (typed = v),
          }),
          W.button3d({
            label: 'save',
            handleClick: () => {
              saved = typed
              pop.close()
            },
          }),
        ],
      })
    )
    document.body.appendChild(panel)
    node(panel.controls(), 'save…').activate!()
    const open = panel.controls()
    expect(open.map((n) => [n.role, n.path])).toEqual([
      ['button', 'save…'],
      ['popup', 'save…'],
    ])
    expect(open[1].children!.map((n) => n.path)).toEqual([
      'save…/',
      'save…/name',
      'save…/save',
    ])
    node(open, 'save…/name').set!('Ada')
    node(open, 'save…/save').activate!()
    expect(saved).toBe('Ada')
    await Promise.resolve()
    expect(panel.controls().map((n) => n.role)).toEqual(['button'])
    panel.remove()
  })
})
