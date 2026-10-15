/*#
# carry

**Picking a thing up and putting it somewhere**, as a model with no surface
in it: what is being carried, where it came from, which target the pointer
is over, whether that target will take it and, if not, WHY. Drag and drop,
and its two-tap twin, on every surface (a page, a panel in a flat scene, a
panel in a headset, a socket on a model in the world) is this model with a
view on top.

Why it is its own thing: a drag that crosses from one panel to another
cannot belong to either. Each panel only sees its own pointer events (a page
listener, or the ray that hits its plane), so they report to one carry, and
the carry decides.

```javascript
import { createCarry } from 'tosijs-3d'

const carry = createCarry()
const holster = {
  id: 'holster',
  accepts: (thing) => (thing.kind === 'pistol' ? [] : ['only a pistol fits']),
  receive: (thing, from) => console.log('holstered', thing, 'from', from),
}

carry.pickUp({ kind: 'pistol' }, 'hand')
carry.over(holster)            // carry.verdict → { ok: true, reasons: [] }
carry.drop()                   // holstered { kind: 'pistol' } from hand
```

## Two ways, one model

- **Drag:** `pickUp` when the press has moved far enough to be a drag
  (`DRAG_THRESHOLD` in the surface's units decides that, in the view), `over`
  as the pointer moves, `drop` on release (on nothing: the carry is cancelled
  and the thing stays where it was).
- **Two taps:** `pickUp` on the first tap, `drop` on the tap on a target.
  Tapping the thing again, or anything that is not a target, puts it down.
  This is the path for a gamepad and the kinder one in a headset, where
  holding a trigger while you aim at arm's length is tiring.

## Targets say why

A target's `accepts(thing, from)` returns REASONS, an empty list meaning yes.
A view lights the targets that would take what is held and dims the rest,
and shows the reason on the one the pointer is over: "two-handed: both hands
must be free" is an answer, a red outline is not.

`drop` is all or nothing: it asks the target again (the world may have
changed since the pointer arrived) and only then calls `receive`. If
`receive` throws or returns reasons, the thing stays where it was.

## Watching it

`carry.subscribe(fn)` calls `fn` with the state after every change: what is
held, the target under the pointer and its verdict. Every view of every
surface draws from that one state, so they cannot disagree.
*/
/*{ "parent": "ui", "order": 60 }*/
/** How far (in the surface's own units) a press must move to become a drag. */
export const DRAG_THRESHOLD = 6;
const EMPTY = {
    thing: null,
    from: null,
    target: null,
    verdict: null,
    mode: null,
};
export function createCarry() {
    let state = { ...EMPTY };
    const listeners = new Set();
    const set = (next) => {
        state = next;
        for (const fn of listeners)
            fn(state);
    };
    const ask = (target) => {
        if (state.thing == null)
            return null;
        let reasons;
        try {
            reasons = target.accepts(state.thing, state.from);
        }
        catch (e) {
            reasons = [String(e?.message ?? e)];
        }
        return { ok: reasons.length === 0, reasons };
    };
    return {
        get state() {
            return state;
        },
        pickUp(thing, from = null, mode = 'drag') {
            set({ thing, from, target: null, verdict: null, mode });
        },
        over(target) {
            if (state.thing == null)
                return;
            if (target === state.target)
                return;
            set({ ...state, target, verdict: target ? ask(target) : null });
        },
        verdictFor: ask,
        drop(target) {
            const into = target === undefined ? state.target : target;
            if (state.thing == null)
                return { done: false, reasons: ['nothing is held'] };
            if (into == null) {
                set({ ...EMPTY });
                return { done: false, reasons: ['dropped on nothing'] };
            }
            // Asked again: the world may have changed since the pointer arrived.
            const verdict = ask(into);
            if (!verdict.ok) {
                set({ ...EMPTY });
                return { done: false, reasons: verdict.reasons };
            }
            let refused;
            try {
                refused = into.receive(state.thing, state.from) || [];
            }
            catch (e) {
                refused = [String(e?.message ?? e)];
            }
            set({ ...EMPTY });
            return refused.length
                ? { done: false, reasons: refused }
                : { done: true, target: into.id };
        },
        cancel() {
            if (state.thing != null)
                set({ ...EMPTY });
        },
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
    };
}
//# sourceMappingURL=carry.js.map