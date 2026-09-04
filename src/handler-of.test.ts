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

  test('falls back to the deprecated on* name, and warns', () => {
    const fn = (): string => 'old'
    const got = handlerOf<() => string>(
      { onChange: fn },
      'handleChange',
      'onChange'
    )
    expect(got).toBe(fn)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('onChange')
    expect(warnings[0]).toContain('handleChange')
  })

  test('handle* WINS when both are given', () => {
    // Not arbitrary: a consumer mid-migration may leave the old one behind, and
    // silently calling the stale callback is the worse failure.
    const next = (): string => 'new'
    const old = (): string => 'old'
    const got = handlerOf<() => string>(
      { handleChange: next, onChange: old },
      'handleChange',
      'onChange'
    )
    expect(got).toBe(next)
  })

  test('warns ONCE per name — a slider reads its callback every pointer move', () => {
    const fn = (): void => {}
    for (let i = 0; i < 50; i++) {
      handlerOf({ onChange: fn }, 'handleChange', 'onChange')
    }
    expect(warnings).toHaveLength(1)
  })

  test('a different deprecated name gets its own warning', () => {
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
})
