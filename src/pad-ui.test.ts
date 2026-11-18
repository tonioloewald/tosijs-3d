import { describe, expect, test } from 'bun:test'
import { padNavigator, padTargets } from './pad-ui'
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
  test('steps down through the controls and off the end', () => {
    const tree = [node('a', 'button', 0), node('b', 'button', 40)]
    const nav = padNavigator(() => tree)
    expect(nav.move(0, 1)).toBe(true)
    expect(nav.focused?.name).toBe('a')
    expect(nav.move(0, 1)).toBe(true)
    expect(nav.focused?.name).toBe('b')
    expect(nav.move(0, 1)).toBe(false)
    expect(nav.move(0, -1)).toBe(true)
    expect(nav.focused?.name).toBe('a')
    expect(nav.move(0, -1)).toBe(false)
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
    nav.move(0, 1)
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
    nav.move(0, 1)
    nav.move(0, 1)
    tree = [node('new', 'button', 0), ...tree.map((n) => ({ ...n }))]
    expect(nav.focused?.name).toBe('b')
  })
})
