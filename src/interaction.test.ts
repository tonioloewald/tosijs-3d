import { describe, test, expect } from 'bun:test'
import {
  interactStep,
  newInteractState,
  activationVeto,
  withinReach,
  type InteractState,
} from './interaction.js'

/** Drive a sequence of inputs, collecting the activations. */
function run(
  steps: Array<{ over: boolean; down: boolean; enabled?: boolean }>
) {
  let s: InteractState = newInteractState()
  const fired: number[] = []
  steps.forEach((input, i) => {
    const r = interactStep(s, input)
    s = r.state
    if (r.activated) fired.push(i)
  })
  return { state: s, fired }
}

describe('activation is press-then-release ON the thing', () => {
  test('a full press fires exactly once, on RELEASE', () => {
    const { fired } = run([
      { over: true, down: false }, // hover
      { over: true, down: true }, // press
      { over: true, down: true }, // hold
      { over: true, down: false }, // release → fire
    ])
    expect(fired).toEqual([3])
  })

  test('holding does not repeat', () => {
    const { fired } = run([
      { over: true, down: false },
      ...Array.from({ length: 20 }, () => ({ over: true, down: true })),
    ])
    expect(fired).toEqual([])
  })

  test('press, drag OFF, release — cancelled, as every real button behaves', () => {
    const { fired } = run([
      { over: true, down: false },
      { over: true, down: true }, // press on it
      { over: false, down: true }, // slide away
      { over: false, down: false }, // release elsewhere
    ])
    expect(fired).toEqual([])
  })

  test('press elsewhere, release ON it — does NOT fire', () => {
    // Arming requires the press to have STARTED here.
    const { fired } = run([
      { over: false, down: true },
      { over: true, down: true },
      { over: true, down: false },
    ])
    expect(fired).toEqual([])
  })

  test('drag off and back before releasing still fires — forgiving, which VR needs', () => {
    const { fired } = run([
      { over: true, down: false },
      { over: true, down: true },
      { over: false, down: true }, // aim wandered
      { over: true, down: true }, // came back
      { over: true, down: false },
    ])
    expect(fired).toEqual([4])
  })
})

describe('hover edges drive the highlight', () => {
  test('entered and exited fire once each', () => {
    const s = newInteractState()
    const a = interactStep(s, { over: true, down: false })
    expect(a.entered).toBe(true)
    expect(a.exited).toBe(false)
    const b = interactStep(a.state, { over: true, down: false })
    expect(b.entered).toBe(false) // still hovering, not re-entered
    const c = interactStep(b.state, { over: false, down: false })
    expect(c.exited).toBe(true)
  })
})

describe('disabled and out of reach', () => {
  test('disabled cannot be hovered or activated', () => {
    const { fired } = run([
      { over: true, down: false, enabled: false },
      { over: true, down: true, enabled: false },
      { over: true, down: false, enabled: false },
    ])
    expect(fired).toEqual([])
  })

  test('disabling MID-PRESS drops the gesture — a door that locks must not open', () => {
    let s = newInteractState()
    s = interactStep(s, { over: true, down: false }).state
    s = interactStep(s, { over: true, down: true }).state // armed
    const off = interactStep(s, { over: true, down: true, enabled: false })
    expect(off.state.armed).toBe(false)
    expect(off.exited).toBe(true)
    const release = interactStep(off.state, { over: true, down: false })
    expect(release.activated).toBe(false)
  })

  test('out of reach behaves exactly like not-over', () => {
    const s = newInteractState()
    const r = interactStep(s, { over: true, down: false, withinReach: false })
    expect(r.entered).toBe(false)
    expect(r.state.phase).toBe('idle')
  })
})

describe('activationVeto — the composition seam', () => {
  test('no vetoes, no refusal', () => {
    expect(activationVeto([], {})).toBeNull()
  })

  test('names the FIRST refuser, so a caller can say why', () => {
    expect(
      activationVeto([
        { name: 'powered', blocks: () => false },
        { name: 'locked', blocks: () => true },
        { name: 'jammed', blocks: () => true },
      ], {})
    ).toBe('locked')
  })

  test('a veto is consulted lazily — later ones need not run', () => {
    let asked = 0
    activationVeto([
      { name: 'locked', blocks: () => true },
      {
        name: 'expensive',
        blocks: () => {
          asked++
          return false
        },
      },
    ], {})
    expect(asked).toBe(0)
  })
})

describe('withinReach', () => {
  const origin = { x: 0, y: 0, z: 0 }
  test('no limit when maxDistance <= 0', () => {
    expect(withinReach(origin, { x: 1e6, y: 0, z: 0 }, 0)).toBe(true)
    expect(withinReach(origin, { x: 1e6, y: 0, z: 0 }, -1)).toBe(true)
  })
  test('inclusive at exactly the limit', () => {
    expect(withinReach(origin, { x: 3, y: 4, z: 0 }, 5)).toBe(true)
  })
  test('excludes just beyond', () => {
    expect(withinReach(origin, { x: 3, y: 4, z: 0.1 }, 5)).toBe(false)
  })
})

describe('a veto is TOLD about the activation', () => {
  /*
  Raised by tosijs-3d-ensemble (#36): a `blocks()` with no argument can only
  close over ambient state, which breaks the moment there is more than one
  actor. It costs nothing today and cannot be added later without changing every
  veto anyone has written.
  */
  interface Who {
    actor?: unknown
    source?: 'pointer' | 'near' | 'api'
    distance?: number
  }
  const lockedUnless = (holder: string) => ({
    name: 'locked',
    blocks: (info: Who) => info.actor !== holder,
  })

  test('TWO ACTORS — the same door answers differently for each', () => {
    // The case one closure over `player.has('brass-key')` cannot express.
    const vetoes = [lockedUnless('npc')]
    expect(activationVeto(vetoes, { actor: 'npc' })).toBeNull()
    expect(activationVeto(vetoes, { actor: 'player' })).toBe('locked')
  })

  test('NEAR versus FAR — a lock you can reach is not one you can see', () => {
    const vetoes = [
      {
        name: 'out-of-reach',
        blocks: (info: Who) => info.source !== 'near' && (info.distance ?? 0) > 2,
      },
    ]
    expect(activationVeto(vetoes, { source: 'near', distance: 0.4 })).toBeNull()
    expect(activationVeto(vetoes, { source: 'pointer', distance: 8 })).toBe(
      'out-of-reach'
    )
  })

  test('a veto that IGNORES its argument is still a veto', () => {
    // The compatibility promise: `blocks: () => !hasKey` keeps working, which
    // is what makes adding the argument free rather than a migration.
    let hasKey = false
    const vetoes = [{ name: 'locked', blocks: () => !hasKey }]
    expect(activationVeto(vetoes, { actor: 'anyone' })).toBe('locked')
    hasKey = true
    expect(activationVeto(vetoes, { actor: 'anyone' })).toBeNull()
  })
})
