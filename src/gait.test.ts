import { describe, expect, test } from 'bun:test'
import { forwardGait } from './gait.js'

describe('forwardGait', () => {
  test('walks, runs, then sprints as the speed rises', () => {
    expect(forwardGait(0.5, 0, false, true).state).toBe('walk')
    expect(forwardGait(1, 0.5, false, true).state).toBe('run')
    expect(forwardGait(1, 0.85, false, true).state).toBe('sprint')
  })

  test('enters the sprint above 0.8, not at 0.75', () => {
    expect(forwardGait(1, 0.75, false, true).sprinting).toBe(false)
    expect(forwardGait(1, 0.81, false, true).sprinting).toBe(true)
  })

  test('holds the sprint down to 0.7, then leaves it', () => {
    expect(forwardGait(1, 0.75, true, true).state).toBe('sprint')
    expect(forwardGait(1, 0.71, true, true).state).toBe('sprint')
    const left = forwardGait(1, 0.69, true, true)
    expect(left.state).toBe('run')
    expect(left.sprinting).toBe(false)
  })

  test('a rig with no sprint clip runs at full speed', () => {
    const g = forwardGait(1, 1, false, false)
    expect(g.state).toBe('run')
    expect(g.sprinting).toBe(false)
    expect(forwardGait(1, 1, true, false).state).toBe('run')
  })
})
