/*#
# handlerOf

**One rule for every callback option in this library: `handleX` is the name,
`onX` still works and warns.** A three-line shim, in its own module so the
smallest widget can adopt it without dragging `widgets3d` into its import
graph.

## Why the rename is not a style preference

These are plain factory functions today, where `onX` is harmless. The moment
one becomes a tosijs **component**, the element creator binds an `on*` prop as a
DOM event **listener** — so the class field is never called, nothing errors, and
you get a callback that simply never fires. `handleX` cannot be mistaken for an
event name, so the rename removes the trap instead of documenting it.

It is not hypothetical. Three separate callbacks shipped broken for exactly this
reason, and none of them raised anything: `themeEditor` read `onChange` while
every caller passed `handleChange`, and two demos passed `handleChange` to
`inputField`, which read `onChange`. In all three the widget worked, the state
updated, and the thing that was supposed to happen next did not.

What made it a trap rather than a typo was that the answer **varied by widget**.
`curve3d` accepted `handleChange`; `inputField` accepted `onChange`; neither
complained about the other. So the shim exists to make one sentence true — *`handleX`
always works* — which is worth more than either spelling winning.

## The warning fires ONCE per name

A slider reads its callback on every pointer move, so a warning per call is a
performance bug wearing a helpful hat.

Both spellings work through 0.8.x. `onX` is removed in 0.9.
*/
/*{ "parent": "UI", "order": 205 }*/
const warnedHandlers = new Set();
/**
 * Read a callback under its NEW name, falling back to the deprecated `onX`.
 *
 * ```js
 * handlerOf(config, 'handleChange', 'onChange')?.(value)
 * ```
 */
export function handlerOf(config, handleName, onName) {
    const next = config[handleName];
    if (typeof next === 'function')
        return next;
    const old = config[onName];
    if (typeof old === 'function') {
        if (!warnedHandlers.has(onName)) {
            warnedHandlers.add(onName);
            console.warn(`tosijs-3d: \`${onName}\` is deprecated — use \`${handleName}\`. Both work in 0.8.x; \`${onName}\` is removed in 0.9.`);
        }
        return old;
    }
    return undefined;
}
/**
 * Test seam — the warning is once-per-name for the life of the module, which
 * makes a second test asserting on it silently pass for the wrong reason.
 */
export function resetHandlerWarnings() {
    warnedHandlers.clear();
}
//# sourceMappingURL=handler-of.js.map