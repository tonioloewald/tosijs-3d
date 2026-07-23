import { describe, test, expect } from 'bun:test'
import { WorldStore } from './world-store'
import { runMinSimConformance } from './min-sim-conformance'
import type { SimulationEvent } from './world-contract'

// tosijs-3d's WorldStore must satisfy the shared MinSimApi conformance kit (the other conformant
// store is Ariosto's reference place-graph; the kit proves they behave identically).
runMinSimConformance(() => new WorldStore(), { describe, test, expect })

// Store-specific: the choice RESOLUTION path. `presentChoice` is in MinSimApi (driver-facing);
// reporting the pick (`chooseOption` → `choiceMade`) is the player-side act, like chooseConversation,
// and is NOT part of the driver-facing contract — so it's tested here, not in the shared kit.
describe('WorldStore: choice resolution (choiceMade)', () => {
  test('presentChoice + chooseOption → one choiceMade with the pick', () => {
    const store = new WorldStore()
    const events: SimulationEvent[] = []
    store.subscribe((e) => events.push(e))

    store.presentChoice({
      id: 'c1',
      at: 'player',
      options: [
        { id: 'fight', label: 'Fight' },
        { id: 'flee', label: 'Flee' },
      ],
    })
    store.chooseOption('c1', 'flee')

    const made = events.filter((e) => e.type === 'choiceMade')
    expect(made.length).toBe(1)
    expect((made[0] as { choiceId: string; optionId: string }).choiceId).toBe(
      'c1'
    )
    expect((made[0] as { optionId: string }).optionId).toBe('flee')
  })

  test('choosing an unknown option, or choosing twice, is a no-op', () => {
    const store = new WorldStore()
    const made: SimulationEvent[] = []
    store.subscribe((e) => {
      if (e.type === 'choiceMade') made.push(e)
    })
    store.presentChoice({
      id: 'c1',
      at: 'player',
      options: [{ id: 'ok', label: 'OK' }],
    })
    store.chooseOption('c1', 'nope') // unknown option → nothing
    expect(made.length).toBe(0)
    store.chooseOption('c1', 'ok') // valid → one event
    store.chooseOption('c1', 'ok') // already consumed → nothing
    expect(made.length).toBe(1)
  })
})
