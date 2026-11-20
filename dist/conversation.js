/*#
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
*/
/*{ "parent": "b3d-npc" }*/
/** Reading time: about 180 words a minute, never under 1.2 s. */
export function speakingSeconds(text) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1.2, 0.4 + words / 3);
}
/** When a line of `seconds` is "somewhat complete": 75% through, or 0.7 s before its end if later. */
export function repliesDueAt(seconds) {
    return Math.max(0, Math.max(seconds * 0.75, seconds - 0.7));
}
export function startConversation(script, host = {}) {
    const player = script.player ?? 'player';
    const flags = new Map();
    const transcript = [];
    const emit = (e) => host.handleEvent?.(e);
    const flag = (name) => (host.flag ? host.flag(name) : flags.get(name));
    const setFlag = (name, value) => host.setFlag ? host.setFlag(name, value) : flags.set(name, value);
    let clock = 0;
    let node = null;
    // Lines still to say, then what comes after them.
    let queue = [];
    let after = [];
    let current = null;
    let entry = null;
    let at = 0;
    let length = 0;
    let offered = [];
    let offerable = [];
    // A pick made during a line that can't be cut waits for it.
    let waiting = null;
    let effects = [];
    let trading = false;
    let ended = false;
    const holds = (c) => {
        if (c == null)
            return true;
        if (Array.isArray(c))
            return c.every(holds);
        if ('has' in c)
            return host.has?.(c.has, c.qty ?? 1) ?? false;
        if ('lacks' in c)
            return !(host.has?.(c.lacks, c.qty ?? 1) ?? false);
        if ('flag' in c)
            return !!flag(c.flag);
        if ('not' in c)
            return !flag(c.not);
        return true;
    };
    const finishLine = (cut) => {
        if (current == null)
            return;
        if (entry != null && cut)
            entry.cut = true;
        const line = current;
        current = null;
        entry = null;
        emit({ type: 'lineEnd', line, cut });
    };
    const offer = () => {
        if (offered.length > 0 || offerable.length === 0)
            return;
        offered = offerable;
        emit({ type: 'replies', replies: offered });
    };
    const say = (line) => {
        current = line;
        at = 0;
        length =
            line.seconds ??
                (line.audio != null ? host.duration?.(line.audio) ?? null : null) ??
                speakingSeconds(line.text);
        entry = {
            speaker: line.speaker,
            text: line.text,
            audio: line.audio,
            at: clock,
        };
        transcript.push(entry);
        emit({ type: 'line', line, seconds: length });
    };
    const finish = () => {
        if (ended)
            return;
        finishLine(true);
        ended = true;
        offered = [];
        offerable = [];
        queue = [];
        effects = [];
        emit({ type: 'end' });
    };
    const enter = (name) => {
        const n = script.nodes[name];
        if (n == null)
            return finish();
        node = name;
        queue = [...n.lines];
        offered = [];
        const replies = (n.replies ?? []).filter((r) => holds(r.when));
        offerable = replies;
        after = replies.length > 0 ? 'replies' : [...(n.then ?? [{ end: true }])];
        advance();
    };
    // Run effects until one moves the talk on (goto, end, trade) or they run out.
    const runEffects = () => {
        while (effects.length > 0 && !ended && !trading) {
            const e = effects.shift();
            emit({ type: 'effect', effect: e });
            if ('goto' in e)
                return enter(e.goto);
            if ('end' in e)
                return finish();
            if ('trade' in e) {
                if (host.trade == null)
                    continue;
                trading = true;
                emit({ type: 'trade' });
                host.trade(() => {
                    if (!trading)
                        return;
                    trading = false;
                    runEffects();
                });
                return;
            }
            if ('set' in e) {
                setFlag(e.set, e.value ?? true);
                continue;
            }
            const give = 'give' in e;
            const kind = give ? e.give : e.take;
            const qty = e.qty ?? 1;
            const reason = give ? host.give?.(kind, qty) : host.take?.(kind, qty);
            if (reason)
                emit({ type: 'refused', effect: e, reason });
        }
        if (effects.length === 0 &&
            !trading &&
            !ended &&
            current == null &&
            queue.length === 0)
            if (offerable.length === 0)
                finish();
    };
    // The next line, or what comes after the lines.
    const advance = () => {
        if (ended)
            return;
        const next = queue.shift();
        if (next != null)
            return say(next);
        if (after === 'replies') {
            // The node's lines are done; the replies stay until picked.
            offer();
            return;
        }
        effects = after;
        after = [];
        runEffects();
    };
    const choose = (reply) => {
        waiting = null;
        finishLine(current != null);
        offered = [];
        offerable = [];
        emit({ type: 'picked', reply });
        const spoken = reply.line;
        queue =
            spoken == null
                ? []
                : [
                    typeof spoken === 'string'
                        ? { speaker: player, text: spoken }
                        : { ...spoken, speaker: player },
                ];
        after = [...reply.then];
        advance();
    };
    const talk = {
        get line() {
            return current;
        },
        get lineAt() {
            return at;
        },
        get lineSeconds() {
            return length;
        },
        get replies() {
            return offered;
        },
        get node() {
            return node;
        },
        get trading() {
            return trading;
        },
        get ended() {
            return ended;
        },
        transcript,
        flags,
        tick(dt) {
            if (ended || dt <= 0)
                return;
            clock += dt;
            if (current == null)
                return;
            at += dt;
            // The last line of a node with replies offers them before it ends.
            if (queue.length === 0 &&
                after === 'replies' &&
                at >= repliesDueAt(length))
                offer();
            if (at >= length) {
                finishLine(false);
                if (waiting != null)
                    return choose(waiting);
                advance();
            }
        },
        pick(id) {
            if (ended || trading)
                return false;
            const reply = offered.find((r) => r.id === id);
            if (reply == null)
                return false;
            if (current != null && current.interruptible === false) {
                waiting = reply;
                return true;
            }
            choose(reply);
            return true;
        },
        end: finish,
        goto(name) {
            if (ended)
                return;
            finishLine(true);
            trading = false;
            effects = [];
            enter(name);
        },
    };
    // It starts at once: the first line's event comes from this call.
    talk.goto(script.start);
    return talk;
}
//# sourceMappingURL=conversation.js.map