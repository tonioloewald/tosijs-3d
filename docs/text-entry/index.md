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
