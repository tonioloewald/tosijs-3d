/*
handlerOf: the one callback-naming rule (documented on the `ui` landing page, under
"Callbacks are named `handleX`"). `handleX` is the name; `onX` was removed in 0.10, is
never returned, and a function found there is reported once. Its own dependency-free
module so the smallest widget (`box`, `surface`) can adopt it without importing
`widgets3d`.

Why: on a tosijs component the element creator binds an `on*` prop as a DOM event
listener, so the callback is silently never called. When the spelling varied by
widget (`curve3d` took `handleChange`, `inputField` took `onChange`) three callbacks
shipped dead with no error. The shim makes one sentence true: `handleX` always works.
The removed name is reported, never silently dropped, and only once per name, because
a slider reads its callback on every pointer move.
*/

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
