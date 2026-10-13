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
