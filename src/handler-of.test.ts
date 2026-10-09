import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { handlerOf, resetHandlerWarnings } from './handler-of.js'

let warnings: string[] = []
const realWarn = console.warn

beforeEach(() => {
  resetHandlerWarnings()
  warnings = []
  console.warn = (...args: unknown[]) => {
    warnings.push(args.join(' '))
  }
})
afterEach(() => {
  console.warn = realWarn
})

describe('handlerOf', () => {
  test('prefers the handle* name and does not warn', () => {
    const fn = (): string => 'new'
    const got = handlerOf<() => string>(
      { handleChange: fn },
      'handleChange',
      'onChange'
    )
    expect(got).toBe(fn)
    expect(warnings).toHaveLength(0)
  })

  test('the removed on* name is NOT returned, and says so', () => {
    // Removed in 0.10. Silently dropping it would recreate the bug the rename
    // was for: a callback that is never called and never mentioned.
    const fn = (): string => 'old'
    const got = handlerOf<() => string>(
      { onChange: fn },
      'handleChange',
      'onChange'
    )
    expect(got).toBeUndefined()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('onChange')
    expect(warnings[0]).toContain('handleChange')
    expect(warnings[0]).toContain('0.10')
  })

  test('handle* is returned when both are given, and the stale one is reported', () => {
    const next = (): string => 'new'
    const old = (): string => 'old'
    const got = handlerOf<() => string>(
      { handleChange: next, onChange: old },
      'handleChange',
      'onChange'
    )
    expect(got).toBe(next)
    expect(warnings).toHaveLength(1)
  })

  test('warns ONCE per name — a slider reads its callback every pointer move', () => {
    const fn = (): void => {}
    for (let i = 0; i < 50; i++) {
      handlerOf({ onChange: fn }, 'handleChange', 'onChange')
    }
    expect(warnings).toHaveLength(1)
  })

  test('a different removed name gets its own warning', () => {
    const fn = (): void => {}
    handlerOf({ onChange: fn }, 'handleChange', 'onChange')
    handlerOf({ onSelect: fn }, 'handleSelect', 'onSelect')
    expect(warnings).toHaveLength(2)
  })

  test('neither present → undefined, and no warning', () => {
    expect(handlerOf({}, 'handleChange', 'onChange')).toBeUndefined()
    expect(warnings).toHaveLength(0)
  })

  test('a non-function under either name is ignored, not called', () => {
    // A stray truthy value (a string from an attribute, say) must not be
    // returned as though it were callable.
    expect(
      handlerOf(
        { handleChange: 'nope', onChange: 42 },
        'handleChange',
        'onChange'
      )
    ).toBeUndefined()
    expect(warnings).toHaveLength(0)
  })

  test('one old name with two replacements warns for each', () => {
    // `onEnter` was `handleEnter` on a field and `whenEnter` on a trigger.
    const fn = (): void => {}
    handlerOf({ onEnter: fn }, 'handleEnter', 'onEnter')
    handlerOf({ onEnter: fn }, 'whenEnter', 'onEnter', '<tosi-b3d-trigger>')
    expect(warnings).toHaveLength(2)
    expect(warnings[1]).toContain('<tosi-b3d-trigger>')
    expect(warnings[1]).toContain('whenEnter')
  })
})
