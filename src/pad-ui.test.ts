import { describe, expect, test } from 'bun:test'
import { asDefault, padNavigator, padTargets } from './pad-ui'
import type { ControlNode } from './widget-semantics'

const node = (
  name: string,
  role: ControlNode['role'],
  y: number,
  extra: Partial<ControlNode> = {}
): ControlNode => ({
  name,
  role,
  path: name,
  interactive: true,
  box: { x: 0, y, w: 200, h: 30 },
  ...extra,
})

describe('padNavigator', () => {
  test('up and down cycle, and Tab does the same', () => {
    const tree = [node('a', 'button', 0), node('b', 'button', 40), node('c', 'button', 80)]
    const nav = padNavigator(() => tree)
    nav.focusDefault()
    expect(nav.focused?.name).toBe('a')
    nav.move(0, -1)
    expect(nav.focused?.name).toBe('c')
    nav.move(0, 1)
    expect(nav.focused?.name).toBe('a')
    nav.tab(1)
    nav.tab(1)
    nav.tab(1)
    expect(nav.focused?.name).toBe('a')
    nav.tab(-1)
    expect(nav.focused?.name).toBe('c')
  })

  test('a panel opens on its default control, else the first', () => {
    const tree = [node('cancel', 'button', 0), node('ok', 'button', 40, { isDefault: true })]
    const nav = padNavigator(() => tree)
    nav.focusDefault()
    expect(nav.focused?.name).toBe('ok')
    const plain = padNavigator(() => [node('x', 'button', 0), node('y', 'button', 40)])
    plain.focusDefault()
    expect(plain.focused?.name).toBe('x')
  })

  test('asDefault marks any widget', () => {
    const w = asDefault({ semantics: () => ({ role: 'slider' as const, name: 's' }) })
    expect((w.semantics() as { isDefault?: boolean }).isDefault).toBe(true)
  })

  test('left and right go beside a control that has no sideways of its own', () => {
    const tree = [
      { ...node('l', 'button', 0), box: { x: 0, y: 0, w: 40, h: 40 } },
      { ...node('r', 'button', 0), box: { x: 50, y: 0, w: 40, h: 40 } },
      node('below', 'button', 60),
    ]
    const nav = padNavigator(() => tree)
    nav.focusDefault()
    nav.move(1, 0)
    expect(nav.focused?.name).toBe('r')
    nav.move(1, 0)
    expect(nav.focused?.name).toBe('r')
  })

  test('a text box takes left and right as its caret', () => {
    let caret = 0
    const nav = padNavigator(() => [node('t', 'textbox', 0, { set: () => {}, nudge: (d) => (caret += d) })])
    nav.focusDefault()
    nav.move(1, 0)
    nav.move(1, 0)
    nav.move(-1, 0)
    expect(caret).toBe(1)
  })

  test('a popup takes the focus, cycles alone, and gives it back', () => {
    let open = false
    const tree = () => [
      node('pick', 'select', 0),
      node('other', 'button', 40),
      ...(open
        ? [
            {
              ...node('pick', 'popup', 0),
              interactive: false,
              children: [
                { ...node('one', 'option', 10), path: 'pick/one' },
                { ...node('two', 'option', 20), path: 'pick/two' },
              ],
            },
          ]
        : []),
    ]
    const nav = padNavigator(tree)
    nav.focusDefault()
    open = true
    nav.sync()
    expect(nav.focused?.path).toBe('pick/one')
    nav.move(0, 1)
    nav.move(0, 1)
    expect(nav.focused?.path).toBe('pick/one')
    open = false
    nav.sync()
    expect(nav.focused?.path).toBe('pick')
  })

  test('skips labels, disabled and undrawn controls', () => {
    const tree = [
      node('label', 'label', 0, { interactive: false }),
      node('off', 'button', 40, { disabled: true }),
      node('nowhere', 'button', 80, { box: undefined }),
      node('ok', 'button', 120),
    ]
    expect(padTargets(tree).map((n) => n.name)).toEqual(['ok'])
  })

  test('left and right step a slider and a select, and B presses', () => {
    let v = 0.5
    let choice = 'b'
    let pressed = 0
    let on = false
    const tree = () => [
      node('s', 'slider', 0, {
        fraction: v,
        setFraction: (f) => (v = f),
      }),
      node('c', 'select', 40, {
        value: choice,
        options: ['a', 'b', 'c'],
        set: (x) => (choice = String(x)),
      }),
      node('go', 'button', 80, { activate: () => pressed++ }),
      node('t', 'toggle', 120, { value: on, set: (x) => (on = !!x) }),
    ]
    const nav = padNavigator(tree)
    nav.focusDefault()
    nav.move(1, 0)
    expect(v).toBeCloseTo(0.55)
    nav.move(0, 1)
    nav.move(-1, 0)
    expect(choice).toBe('a')
    nav.move(0, 1)
    nav.activate()
    expect(pressed).toBe(1)
    nav.move(0, 1)
    nav.activate()
    expect(on).toBe(true)
  })

  test('keeps focus by path across a rebuild', () => {
    let tree = [node('a', 'button', 0), node('b', 'button', 40)]
    const nav = padNavigator(() => tree)
    nav.focusDefault()
    nav.move(0, 1)
    tree = [node('new', 'button', 0), ...tree.map((n) => ({ ...n }))]
    expect(nav.focused?.name).toBe('b')
  })
})
