# conversation

**Talking to someone, as data and a clock.** A script is a set of nodes: each
says some lines and may offer the player replies. A reply can depend on what
the player carries or has done, and can do things: give or take an item, open
a trade, set a flag, go to another node, end the talk. The playback machine
plays the lines in time, offers the replies before the last line has quite
finished, and lets a pick cut a line short, which is what keeps a conversation
from being a wait, then a read, then a pick (see CONVERSATION-DESIGN.md).

```javascript
import { startConversation } from 'tosijs-3d'

const talk = startConversation(script, {
  has: (kind, qty) => countOf(kind) >= qty,
  give: (kind, qty) => putInBag(kind, qty), // null, or why not
  take: (kind, qty) => takeFromBag(kind, qty),
  trade: (done) => openShop(done),
  handleEvent: (e) => stage(e), // lines, replies, cuts, effects, the end
})
// each frame, in scene time:
talk.tick(dt)
// when the player picks:
talk.pick('potion')
```

## A script

```javascript
const script = {
  start: 'hello',
  nodes: {
    hello: {
      lines: [{ speaker: 'shopkeeper', text: 'Back again?', gesture: 'wave' }],
      replies: [
        { id: 'shop', label: 'What do you sell?', then: [{ trade: true }, { goto: 'after' }] },
        {
          id: 'potion', label: 'Your potion.', line: "Here's that potion I promised you.",
          when: { has: 'Potion' },
          then: [{ take: 'Potion' }, { give: 'gold', qty: 20 }, { set: 'potion-delivered' }, { goto: 'thanks' }],
        },
        { id: 'bye', label: 'Bye.', then: [{ end: true }] },
      ],
    },
    thanks: { lines: [{ speaker: 'shopkeeper', text: 'You remembered!' }], then: [{ goto: 'hello' }] },
    after: { lines: [{ speaker: 'shopkeeper', text: 'Anything else?' }], then: [{ goto: 'hello' }] },
  },
}
```

- A **line** is `{ speaker, text, audio?, seconds?, gesture?, interruptible? }`.
  Its length is `seconds`, else the audio's (`duration(audio)` from the host),
  else read off its words. A line is interruptible unless it says
  `interruptible: false` (a punchline, a reveal): a pick waits for it.
- A **reply** is `{ id, label, line?, when?, then }`: `label` is what you
  pick, `line` what your character says (a string, or a line with its own
  audio; none, and nothing is said). A reply whose `when` fails is not
  offered.
- A **condition** is `{ has, qty? }`, `{ lacks }`, `{ flag }`, `{ not }`
  (a flag unset), or a list of them, all of which must hold.
- An **effect** is `{ goto }`, `{ end: true }`, `{ give, qty? }` (to the
  player), `{ take, qty? }` (from the player), `{ trade: true }` (pauses until
  the host says the trade is done), or `{ set, value? }` (a flag). A node with
  no replies runs its own `then` after its lines; with neither, the talk ends.
  A refused give or take (a full bag) is an event the staging can show, and
  the effects after it still run.

The replies appear once the last line is "somewhat complete": at 75% of it,
or 0.7 s before its end if that is later. Every line said goes in
`transcript`. Pure: no DOM, no Babylon, no clock but `tick(dt)`.
