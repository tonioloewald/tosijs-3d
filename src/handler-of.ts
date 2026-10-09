/*#
# handlerOf

**One rule for every callback option in this library: `handleX` is the name.**
`onX` was removed in 0.10: it is no longer called, and passing one says so in
the console. A three-line shim, in its own module so the smallest widget can
adopt it without dragging `widgets3d` into its import graph.

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

## A removed name is reported, never silently dropped

A callback that is quietly never called is the failure this module exists to
end, so removing `onX` must not recreate it. `handlerOf` still takes the old
name: if it finds a function there it warns that the option is ignored and
names the replacement. From 0.8.0 to 0.9.x both spellings worked.

## The warning fires ONCE per name

A slider reads its callback on every pointer move, so a warning per call is a
performance bug wearing a helpful hat.
*/
/*{ "parent": "widgets3d", "order": 10 }*/

const warnedHandlers = new Set<string>()

/**
 * Read a callback by its name. `onName` is the spelling removed in 0.10: it is
 * never returned, and a function found there is reported once.
 *
 * ```js
 * handlerOf(config, 'handleChange', 'onChange')?.(value)
 * ```
 */
export function handlerOf<T>(
  config: Record<string, unknown>,
  handleName: string,
  onName: string,
  /** Whose option this is (`'<tosi-b3d-trigger>'`), named in the warning. */
  where?: string
): T | undefined {
  // Keyed on the PAIR: `onEnter` was the old name of two different things
  // (`handleEnter` on a field, `whenEnter` on a trigger), and keyed on the old
  // name alone the second one was dropped without a word.
  const key = `${where ?? ''}:${onName}:${handleName}`
  if (typeof config[onName] === 'function' && !warnedHandlers.has(key)) {
    warnedHandlers.add(key)
    console.warn(
      `tosijs-3d: ${
        where ? where + ' ' : ''
      }\`${onName}\` was removed in 0.10 and is IGNORED — use \`${handleName}\`.`
    )
  }
  const next = config[handleName]
  return typeof next === 'function' ? (next as T) : undefined
}

/**
 * Test seam — the warning is once-per-name for the life of the module, which
 * makes a second test asserting on it silently pass for the wrong reason.
 */
export function resetHandlerWarnings(): void {
  warnedHandlers.clear()
}
