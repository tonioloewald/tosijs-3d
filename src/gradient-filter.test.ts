import { test, expect, describe } from 'bun:test'
import {
  PiecewiseLinearFilter,
  identityFilter,
  plateauFilter,
} from './gradient-filter'

describe('PiecewiseLinearFilter', () => {
  test('identity filter returns input unchanged', () => {
    const f = identityFilter()
    expect(f.evaluate(0)).toBe(0)
    expect(f.evaluate(0.5)).toBe(0.5)
    expect(f.evaluate(1)).toBe(1)
  })

  test('clamps input to [0,1]', () => {
    const f = identityFilter()
    expect(f.evaluate(-0.5)).toBe(0)
    expect(f.evaluate(1.5)).toBe(1)
  })

  test('interpolates between points', () => {
    const f = new PiecewiseLinearFilter([
      { x: 0, y: 0 },
      { x: 0.5, y: 1 },
      { x: 1, y: 0 },
    ])
    expect(f.evaluate(0)).toBe(0)
    expect(f.evaluate(0.25)).toBeCloseTo(0.5)
    expect(f.evaluate(0.5)).toBe(1)
    expect(f.evaluate(0.75)).toBeCloseTo(0.5)
    expect(f.evaluate(1)).toBe(0)
  })

  test('output is not clamped', () => {
    const f = new PiecewiseLinearFilter([
      { x: 0, y: -2 },
      { x: 1, y: 3 },
    ])
    expect(f.evaluate(0)).toBe(-2)
    expect(f.evaluate(1)).toBe(3)
  })

  test('addPoint inserts and maintains sort order', () => {
    const f = identityFilter()
    f.addPoint(0.5, 0.8)
    expect(f.points.length).toBe(3)
    expect(f.points[1].x).toBe(0.5)
    expect(f.points[1].y).toBe(0.8)
  })

  test('removePoint keeps minimum 2 points', () => {
    const f = identityFilter()
    f.removePoint(0)
    expect(f.points.length).toBe(2)
  })

  test('removePoint works with 3+ points', () => {
    const f = new PiecewiseLinearFilter([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ])
    f.removePoint(1)
    expect(f.points.length).toBe(2)
  })

  test('setPoint updates and re-sorts', () => {
    const f = identityFilter()
    f.addPoint(0.5, 0.5)
    f.setPoint(1, 0.3, 0.9)
    expect(f.points[1].x).toBe(0.3)
    expect(f.points[1].y).toBe(0.9)
  })
})

describe('plateauFilter', () => {
  test('creates stepped output', () => {
    const f = plateauFilter(3)
    // First plateau should be at y=0
    expect(f.evaluate(0)).toBe(0)
    expect(f.evaluate(0.1)).toBe(0)
    // Second plateau at y=0.5
    expect(f.evaluate(0.4)).toBeCloseTo(0.5, 1)
    expect(f.evaluate(0.6)).toBeCloseTo(0.5, 1)
    // Third plateau at y=1
    expect(f.evaluate(0.9)).toBeCloseTo(1, 1)
  })
})
