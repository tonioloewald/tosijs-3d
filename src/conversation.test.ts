import { describe, expect, test } from 'bun:test'
import {
  LINE_PAUSE,
  startConversation,
  speakingSeconds,
  repliesDueAt,
  type ConversationEvent,
  type ConversationScript,
} from './conversation.js'

const shop: ConversationScript = {
  start: 'hello',
  nodes: {
    hello: {
      lines: [
        { speaker: 'keeper', text: 'Back again?', seconds: 2, gesture: 'wave' },
      ],
      replies: [
        {
          id: 'shop',
          label: 'What do you sell?',
          then: [{ trade: true }, { goto: 'after' }],
        },
        {
          id: 'potion',
          label: 'Your potion.',
          line: "Here's that potion I promised you.",
          when: { has: 'Potion' },
          then: [
            { take: 'Potion' },
            { give: 'gold', qty: 20 },
            { set: 'delivered' },
            { goto: 'thanks' },
          ],
        },
        { id: 'bye', label: 'Bye.', then: [{ end: true }] },
      ],
    },
    thanks: {
      lines: [{ speaker: 'keeper', text: 'You remembered!', seconds: 1 }],
      then: [{ goto: 'hello' }],
    },
    after: {
      lines: [{ speaker: 'keeper', text: 'Anything else?', seconds: 1 }],
      then: [{ goto: 'hello' }],
    },
  },
}

// A bag of kinds, and every event seen.
function world(bag: Record<string, number> = {}) {
  const events: ConversationEvent[] = []
  let tradeDone: (() => void) | null = null
  const host = {
    has: (k: string, q: number) => (bag[k] ?? 0) >= q,
    give: (k: string, q: number) => {
      bag[k] = (bag[k] ?? 0) + q
      return null
    },
    take: (k: string, q: number) => {
      if ((bag[k] ?? 0) < q) return `no ${k}`
      bag[k] -= q
      return null
    },
    trade: (done: () => void) => (tradeDone = done),
    handleEvent: (e: ConversationEvent) => events.push(e),
  }
  return {
    bag,
    events,
    host,
    closeTrade: () => tradeDone?.(),
    types: () => events.map((e) => e.type),
  }
}

const run = (talk: { tick: (dt: number) => void }, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.05) talk.tick(0.05)
}

describe('conversation', () => {
  test('a line plays for its length, and the replies come before it ends', () => {
    const w = world()
    const talk = startConversation(shop, w.host)
    expect(talk.line?.text).toBe('Back again?')
    expect(talk.replies).toEqual([])
    run(talk, 1.25)
    expect(talk.replies).toEqual([]) // 75% of 2 s is 1.5 s
    run(talk, 0.3)
    expect(talk.replies.map((r) => r.id)).toEqual(['shop', 'bye']) // no potion, not offered
    expect(talk.line).not.toBeNull()
    run(talk, 1)
    expect(talk.line).toBeNull()
    expect(talk.replies.length).toBe(2) // they wait
  })

  test('a reply that depends on the bag is offered when you carry it', () => {
    const w = world({ Potion: 1 })
    const talk = startConversation(shop, w.host)
    run(talk, 2)
    expect(talk.replies.map((r) => r.id)).toEqual(['shop', 'potion', 'bye'])
  })

  test('a pick cuts the line, the player says theirs, then it takes, gives and sets', () => {
    const w = world({ Potion: 1 })
    const talk = startConversation(shop, w.host)
    run(talk, 1.6)
    expect(talk.pick('potion')).toBe(true)
    expect(talk.transcript[0].cut).toBe(true)
    expect(talk.line).toEqual({
      speaker: 'player',
      text: "Here's that potion I promised you.",
    })
    run(talk, speakingSeconds(talk.line!.text) + 0.1)
    expect(w.bag).toEqual({ Potion: 0, gold: 20 })
    expect(talk.flags.get('delivered')).toBe(true)
    expect(talk.node).toBe('thanks')
    expect(talk.line).toBeNull() // a beat after the player's line
    run(talk, LINE_PAUSE)
    expect(talk.line?.text).toBe('You remembered!')
    run(talk, 1.6)
    // Back to hello; the potion is gone, so it is not offered again.
    expect(talk.node).toBe('hello')
    run(talk, 2)
    expect(talk.replies.map((r) => r.id)).toEqual(['shop', 'bye'])
  })

  test('a trade pauses the talk and it picks up when the trade closes', () => {
    const w = world()
    const talk = startConversation(shop, w.host)
    run(talk, 2.1)
    talk.pick('shop')
    expect(talk.trading).toBe(true)
    run(talk, 5)
    expect(talk.node).toBe('hello')
    expect(talk.pick('bye')).toBe(false) // nothing on offer while trading
    w.closeTrade()
    expect(talk.trading).toBe(false)
    expect(talk.node).toBe('after')
    expect(talk.line?.text).toBe('Anything else?')
  })

  test('a line that may not be cut makes a pick wait for it', () => {
    const script: ConversationScript = {
      start: 'a',
      nodes: {
        a: {
          lines: [
            {
              speaker: 'npc',
              text: 'And the butler did it.',
              seconds: 2,
              interruptible: false,
            },
          ],
          replies: [{ id: 'gasp', label: 'No!', then: [{ end: true }] }],
        },
      },
    }
    const w = world()
    const talk = startConversation(script, w.host)
    run(talk, 1.6)
    expect(talk.pick('gasp')).toBe(true)
    expect(talk.ended).toBe(false)
    expect(talk.line?.text).toBe('And the butler did it.')
    run(talk, 0.5)
    expect(talk.ended).toBe(true)
    expect(talk.transcript[0].cut).toBeUndefined()
  })

  test('a refused effect is an event, and the rest still runs', () => {
    const script: ConversationScript = {
      start: 'a',
      nodes: {
        a: {
          lines: [],
          then: [{ take: 'Key' }, { set: 'asked' }, { end: true }],
        },
      },
    }
    const w = world()
    const talk = startConversation(script, w.host)
    expect(w.events.find((e) => e.type === 'refused')).toMatchObject({
      reason: 'no Key',
    })
    expect(talk.flags.get('asked')).toBe(true)
    expect(talk.ended).toBe(true)
  })

  test('a node with neither replies nor then ends the talk; end() stops it now', () => {
    const w = world()
    const done = startConversation(
      {
        start: 'a',
        nodes: { a: { lines: [{ speaker: 'n', text: 'Hm.', seconds: 1 }] } },
      },
      w.host
    )
    run(done, 1.1)
    expect(done.ended).toBe(true)
    const walked = startConversation(shop, world().host)
    walked.end()
    expect(walked.ended).toBe(true)
    expect(walked.transcript[0].cut).toBe(true)
  })

  test('a line that follows one which ran to its end waits a beat; a pick does not', () => {
    const script: ConversationScript = {
      start: 'a',
      pause: 0.5,
      nodes: {
        a: {
          lines: [
            { speaker: 'n', text: 'One.', seconds: 1 },
            { speaker: 'n', text: 'Two.', seconds: 1 },
          ],
          replies: [{ id: 'r', label: 'Go on', line: 'Go on.', then: [{ end: true }] }],
        },
      },
    }
    const w = world()
    const talk = startConversation(script, w.host)
    expect(talk.line?.text).toBe('One.') // the first line starts at once
    run(talk, 1.1)
    expect(talk.line).toBeNull()
    expect(w.types().filter((e) => e === 'line').length).toBe(1)
    run(talk, 0.5)
    expect(talk.line?.text).toBe('Two.')
    run(talk, 1)
    expect(talk.replies.length).toBe(1)
    expect(talk.pick('r')).toBe(true)
    expect(talk.line?.text).toBe('Go on.') // the player answers at once
  })

  test('a line is as long as its audio when the host knows it', () => {
    const script: ConversationScript = {
      start: 'a',
      nodes: {
        a: {
          lines: [
            { speaker: 'n', text: 'Hold there.', audio: 'guard-halt.mp3' },
          ],
        },
      },
    }
    const talk = startConversation(script, {
      duration: (a) => (a === 'guard-halt.mp3' ? 3.2 : null),
    })
    expect(talk.lineSeconds).toBe(3.2)
  })

  test('timing rules', () => {
    expect(speakingSeconds('Hm.')).toBe(1.2)
    expect(
      speakingSeconds('one two three four five six seven eight nine')
    ).toBeCloseTo(3.4)
    expect(repliesDueAt(8)).toBeCloseTo(7.3) // 0.7 s before the end beats 75%
    expect(repliesDueAt(2)).toBeCloseTo(1.5)
  })
})
