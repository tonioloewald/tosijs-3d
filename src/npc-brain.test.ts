import { describe, expect, test } from 'bun:test'
import { npcBrain, type NpcBrainOptions, type NpcIntent, type NpcPercept } from './npc-brain.js'
import { headingDeg } from './agent-driver.js'
import { STEALTH } from './sensorium.js'

const DT = 1 / 30

type Target = NonNullable<NpcPercept['target']>

/** Walk a body after its brain: turns to face where it goes, walks 1.2 m/s, runs 3. */
function run(
  options: NpcBrainOptions,
  seconds: number,
  target: (t: number) => Target | null,
  start = { x: 0, z: 0, heading: 0 },
  extra: { frozen?: boolean; noise?: (t: number) => NpcPercept['noises'] } = {}
) {
  const brain = npcBrain(options)
  const self = { ...start }
  const log: Array<NpcIntent & { x: number; z: number; t: number; heading: number }> = []
  for (let t = 0; t < seconds; t += DT) {
    const intent = brain.step(
      { self, target: target(t), noises: extra.noise?.(t) ?? [] },
      DT
    )
    log.push({ ...intent, x: self.x, z: self.z, t, heading: self.heading })
    if (intent.moveTo && intent.pace !== 'stop' && !extra.frozen) {
      const dx = intent.moveTo.x - self.x
      const dz = intent.moveTo.z - self.z
      const d = Math.hypot(dx, dz)
      if (d > 0.05) {
        self.heading = headingDeg({ x: dx, z: dz })
        const v = (intent.pace === 'run' ? 3 : 1.2) * DT
        self.x += (dx / d) * Math.min(v, d)
        self.z += (dz / d) * Math.min(v, d)
      }
    }
  }
  return log
}

describe('npc brain', () => {
  test('a guard stands where it was put until something gets its attention', () => {
    const log = run({ home: { x: 0, z: 0 } }, 20, () => null)
    expect(log.every((s) => s.mode === 'idle' && s.moveTo == null)).toBe(true)
  })

  test('a patroller walks its route in a loop, and rejoins it after an alarm', () => {
    const route = [{ x: 0, z: 0 }, { x: 8, z: 0 }, { x: 8, z: 8 }]
    const visits = (log: Array<{ x: number; z: number }>) =>
      route.map((p) => log.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 1.3))
    const calm = run({ home: { x: 0, z: 0 }, patrol: route }, 45, () => null)
    expect(visits(calm)).toEqual([true, true, true])
    expect(calm.some((s) => s.mode === 'patrol' && s.moveTo == null)).toBe(true)
    // A noise calls it away; afterwards it is patrolling again.
    const called = run({ home: { x: 0, z: 0 }, patrol: route }, 60, () => null, undefined, {
      noise: (t) => (Math.abs(t - 3) < DT / 2 ? [{ x: -6, z: 4, carries: 15 }] : []),
    })
    const firstLook = called.findIndex((s) => s.mode === 'investigate')
    expect(firstLook).toBeGreaterThan(-1)
    expect(called.slice(firstLook).some((s) => s.mode === 'patrol')).toBe(true)
  })

  test('a wanderer wanders near home, the same way for the same seed', () => {
    const opts = { home: { x: 5, z: 5 }, seed: 3, wanderRadius: 6 }
    const a = run(opts, 60, () => null, { x: 5, z: 5, heading: 0 })
    const b = run(opts, 60, () => null, { x: 5, z: 5, heading: 0 })
    expect(a.map((s) => s.x)).toEqual(b.map((s) => s.x))
    expect(a.some((s) => s.mode === 'wander')).toBe(true)
    for (const s of a) expect(Math.hypot(s.x - 5, s.z - 5)).toBeLessThan(6.5)
  })

  test('it notices you in front from 50 m, chases, and attacks within reach', () => {
    const log = run({ home: { x: 0, z: 0 } }, 25, () => ({ x: 0, z: 40, clearLine: true }))
    const chased = log.findIndex((s) => s.mode === 'chase')
    const attacked = log.findIndex((s) => s.attack)
    expect(log[0].sees).toBe(true)
    expect(chased).toBeGreaterThan(-1)
    // It takes a moment to react: its think clock.
    expect(log[chased].t).toBeGreaterThan(0.5)
    expect(attacked).toBeGreaterThan(chased)
    expect(Math.hypot(log[attacked].x, log[attacked].z - 40)).toBeLessThan(1.5)
    const second = log.findIndex((s, i) => i > attacked && s.attack)
    expect(log[second].t - log[attacked].t).toBeGreaterThanOrEqual(1.55)
  })

  test('behind it: noticed within 10 m, unless you crouch (3.3 m)', () => {
    const behind = (z: number, conspicuity = 1) =>
      run({ home: { x: 0, z: 0 } }, 3, () => ({ x: 0, z, clearLine: true, conspicuity }))
    expect(behind(-12).every((s) => !s.senses && s.mode === 'idle')).toBe(true)
    expect(behind(-8).some((s) => s.mode === 'chase' || s.mode === 'attack')).toBe(true)
    expect(behind(-8, STEALTH).every((s) => s.mode === 'idle')).toBe(true)
    expect(behind(-3, STEALTH).some((s) => s.senses)).toBe(true)
  })

  test('cover hides you in front', () => {
    const log = run({ home: { x: 0, z: 0 } }, 5, () => ({ x: 0, z: 20, clearLine: false }))
    expect(log.every((s) => s.mode === 'idle')).toBe(true)
  })

  test('a noise sends it to look where the noise was, not at you', () => {
    // You are hidden behind it, out of reach; a can lands 12 m to its right.
    const log = run(
      { home: { x: 0, z: 0 } },
      30,
      () => ({ x: 0, z: -20, clearLine: false }),
      { x: 0, z: 0, heading: 0 },
      { noise: (t) => (Math.abs(t - 1) < DT / 2 ? [{ x: 12, z: 0, carries: 15 }] : []) }
    )
    const looking = log.filter((s) => s.mode === 'investigate')
    expect(looking.length).toBeGreaterThan(0)
    expect(looking.some((s) => s.moveTo && s.moveTo.x === 12 && s.moveTo.z === 0)).toBe(true)
    expect(Math.min(...log.map((s) => Math.hypot(s.x - 12, s.z)))).toBeLessThan(1.3)
    expect(log.every((s) => s.mode !== 'chase')).toBe(true)
    // Then it looks about and goes back to its post.
    expect(log.some((s) => s.mode === 'return')).toBe(true)
    const last = log[log.length - 1]
    expect(Math.hypot(last.x, last.z)).toBeLessThan(1.3)
  })

  test('a noise too far away is not heard', () => {
    const log = run({ home: { x: 0, z: 0 } }, 3, () => null, undefined, {
      noise: () => [{ x: 30, z: 0, carries: 25 }],
    })
    expect(log.every((s) => !s.heard && s.mode === 'idle')).toBe(true)
  })

  test('it loses you, searches, then goes back', () => {
    const log = run({ home: { x: 0, z: 0 }, memory: 3 }, 40, (t) =>
      t < 2 ? { x: 0, z: 8, clearLine: true } : { x: 0, z: 60, clearLine: false }
    )
    const modes = log.map((s) => s.mode)
    const firstSearch = modes.indexOf('search')
    expect(modes.indexOf('chase')).toBeGreaterThan(-1)
    expect(firstSearch).toBeGreaterThan(modes.indexOf('chase'))
    expect(modes.slice(firstSearch).includes('return')).toBe(true)
    expect(log[log.length - 1].alertness).toBeLessThan(0.5)
  })

  test('a dumb one chases where you were; a sharp one keeps up', () => {
    const lag = (skill: number) => {
      const log = run({ home: { x: 0, z: 0 }, skill }, 6, (t) => ({
        x: -6 + 4 * t,
        z: 8,
        clearLine: true,
      }))
      let sum = 0
      let n = 0
      for (const s of log) {
        if (s.mode !== 'chase' || s.moveTo == null) continue
        sum += Math.abs(s.moveTo.x - (-6 + 4 * s.t))
        n++
      }
      return sum / n
    }
    expect(lag(0)).toBeGreaterThan(lag(1) * 2)
  })

  test('stuck against something, it steps off to one side', () => {
    const log = run(
      { home: { x: 0, z: 0 } },
      6,
      () => ({ x: 0, z: 10, clearLine: true }),
      { x: 0, z: 0, heading: 0 },
      { frozen: true }
    )
    const detours = log.filter((s) => s.mode === 'chase' && s.moveTo && s.moveTo.z < 5)
    expect(detours.length).toBeGreaterThan(0)
  })

  test('hurt from behind, it knows where you are at once', () => {
    const brain = npcBrain({ home: { x: 0, z: 0 } })
    brain.step({ self: { x: 0, z: 0, heading: 0 }, target: null }, DT)
    brain.hurt({ x: 0, z: -15 })
    const i = brain.step({ self: { x: 0, z: 0, heading: 0 }, target: null }, DT)
    expect(i.mode).toBe('chase')
    expect(i.moveTo).toEqual({ x: 0, z: -15 })
  })
})
