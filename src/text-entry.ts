/*#
# text-entry

**Is the person typing into something?** One predicate, used by everything that
listens for keys on `window`.

A 3D page installs global key listeners — `KeyboardGamepad` maps WASD to a
virtual stick, the on-screen keyboard routes characters to whichever field has
focus — and `window` is the right target for both: you steer without clicking
the canvas first, and a headset has no DOM focus to speak of.

But a page is not only a scene. It has a nav, a search box, an address field a
consumer put beside the canvas. A global listener that claims `a` because WASD
maps it takes the letter out of whatever the person was actually typing:

> "I was trying to search nav for lamp and typing (on my iPhone) didn't work.
> Are we somehow preventing regular keyboards from working?"

We were. `l-a-m-p` contains a strafe key, so the search box lost the character
AND the demo strafed while it was typed — a `preventDefault` with no notion of
where the event came from.

## Why a predicate rather than a flag

The alternative is a mode — "input focused, listeners off" — which needs
something to keep it in step with the DOM and is wrong for exactly as long as it
is stale. Asking the event where it came from cannot go stale, costs a property
read, and is right for elements nobody has thought of yet: `contenteditable`,
a `combobox`, a shadow-DOM input a consumer wrote.

## What counts

`<input>` (except the ones that are buttons — a checkbox is not typing),
`<textarea>`, `<select>`, anything `contenteditable`, and anything wearing a
`textbox`/`searchbox`/`combobox` role. `composedPath` is consulted first, so an
input inside a shadow root is still recognised — `event.target` for one is the
HOST element, which is not an input and never matches.
*/
/*{ "parent": "Input", "order": 118 }*/

/** `<input type>` values that are pressed rather than typed into. */
const NOT_TYPING = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

const TYPING_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton'])

const typesInto = (node: unknown): boolean => {
  const el = node as {
    tagName?: string
    type?: string
    isContentEditable?: boolean
    getAttribute?: (n: string) => string | null
  } | null
  if (el == null || typeof el.tagName !== 'string') return false
  const tag = el.tagName.toUpperCase()
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') return !NOT_TYPING.has(String(el.type ?? 'text'))
  if (el.isContentEditable === true) return true
  const role = el.getAttribute?.('role')
  return role != null && TYPING_ROLES.has(role)
}

/**
 * Did this event come from somewhere the person is typing?
 *
 * Call it before consuming a key on a global listener. Returns `false` for a
 * missing or malformed event rather than throwing — a listener that dies on a
 * synthetic event is worse than one that occasionally claims a key.
 */
export function isTextEntry(event: unknown): boolean {
  const e = event as {
    target?: unknown
    composedPath?: () => unknown[]
  } | null
  if (e == null) return false
  /*
  `composedPath` FIRST, because `target` lies about shadow DOM.

  An input inside a shadow root reports the HOST element as the target — a
  `<tosi-something>`, which is not an input and matches nothing below. The
  composed path contains the real element, and a consumer's component wrapping
  its own search field is not an exotic case.
  */
  try {
    const path = e.composedPath?.()
    if (Array.isArray(path)) {
      for (const node of path) {
        if (typesInto(node)) return true
        // Stop at the document: everything above is window, and a path that
        // long means we already passed anything that could type.
        if ((node as { nodeType?: number })?.nodeType === 9) break
      }
      return false
    }
  } catch {
    // A synthetic event may have no composedPath, or one that throws.
  }
  return typesInto(e.target)
}
