import { describe, expect, test } from 'bun:test'
import {
  formatRuns,
  formatSweep,
  groupKey,
  recordRun,
  summarise,
  topGroups,
} from './cost-sweep.js'

describe('cost sweep', () => {
  test('summarise is the median and the 95th percentile', () => {
    const s = summarise([14, 14, 14, 28, 14, 14, 14, 14, 14, 90])
    expect(s.ms).toBe(14)
    expect(s.p95).toBe(90)
    expect(summarise([])).toEqual({ ms: 0, p95: 0 })
  })

  test('meshes sharing a material are one group; numbered meshes too', () => {
    expect(groupKey('tile_12', 'terrain')).toBe('terrain')
    expect(groupKey('tile_12')).toBe('tile')
    expect(groupKey('tile_7', '')).toBe('tile')
    expect(groupKey('12')).toBe('unnamed')
    expect(groupKey('m', 'deco-leaf-Green')).toBe('deco')
    expect(groupKey('m', 'b3d-sky-forked')).toBe('b3d-sky')
  })

  test('the heaviest groups are kept and the rest lumped', () => {
    const groups = new Map([
      ['a', { weight: 5, items: ['a1'] }],
      ['b', { weight: 50, items: ['b1', 'b2'] }],
      ['c', { weight: 1, items: ['c1'] }],
      ['d', { weight: 2, items: ['d1'] }],
    ])
    const top = topGroups(groups, 2)
    expect(top.map((g) => g.name)).toEqual(['b', 'a', 'other'])
    expect(top[2].items.sort()).toEqual(['c1', 'd1'])
  })

  test('the report leads with the baseline, then ranks by what was saved', () => {
    const lines = formatSweep([
      { name: 'baseline', ms: 80, p95: 90, saved: 0, frames: 25 },
      { name: '- water', ms: 55, p95: 60, saved: 25, frames: 36 },
      { name: '- terrain', ms: 40, p95: 45, saved: 40, frames: 50 },
      { name: '- sky', ms: 82, p95: 95, saved: -2, frames: 24 },
    ])
    expect(lines[0]).toStartWith('baseline  80.0ms  13fps')
    expect(lines[1]).toContain('- terrain')
    expect(lines[2]).toContain('- water')
    expect(lines[3]).toStartWith('+2.0')
  })

  test('a run that hangs at once does not hide the one before it', () => {
    const done = {
      n: 1,
      began: 0,
      lines: ['baseline', '-5 sky'],
      starting: null,
    }
    const hung = {
      n: 2,
      began: 0,
      lines: [],
      starting: 'baseline',
      phase: 'measuring' as const,
    }
    let runs = recordRun([], done)
    runs = recordRun(runs, { ...hung, starting: 'x' })
    runs = recordRun(runs, hung)
    expect(runs.map((r) => r.n)).toEqual([2, 1])
    const lines = formatRuns(runs)
    expect(lines[0]).toContain('run 2')
    expect(lines[0]).toContain('STOPPED measuring "baseline"')
    expect(lines[1]).toContain('run 1')
    expect(lines[1]).toContain('finished')
    expect(lines.slice(2)).toEqual(['baseline', '-5 sky'])
    // While it is the one running, it says so.
    expect(formatRuns(runs, 2)[0]).toContain('running')
    // Only the newest few are kept.
    for (let n = 3; n < 9; n++) runs = recordRun(runs, { ...done, n })
    expect(runs.map((r) => r.n)).toEqual([8, 7, 6, 5])
  })
})
