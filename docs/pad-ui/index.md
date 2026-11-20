# pad-ui

**Reaching a panel's controls with a gamepad.** A panel already describes
itself as named controls (its [widget semantics](/widget-semantics/): role,
value, where it is drawn, `set` and `activate`). `padNavigator` walks those
with a D-pad: up and down (or any direction) step to the nearest control that
way, left and right change a slider or a choice, and the click button presses
a button, flips a toggle or opens a section. It works through each control's
own path, as an agent or a screen reader does, so nothing here knows a widget.

Up and down (and **Tab** / shift-Tab) step through the controls in order and
CYCLE, so the last is one press from the first. Left and right do what the
control does sideways: a slider moves, a choice changes, a text box's caret
moves; anything else goes to the control beside it (a row of icons).

When a panel opens, its DEFAULT control takes the focus, else its first.
Mark the default with `button3d({ label: 'OK', default: true })`, or any
widget with `asDefault(widget)`. A popup opened inside the panel (a select's
list, a confirm) takes the focus the same way and gives it back when it closes.

A control can also hear that it gained or lost the focus (`focus(on)` in its
semantics), to show what a hover would: a thing's info, whether a carried thing
fits a slot. When the focused control leaves the list (a thing taken across in
a trade), the one now in its place takes the focus, so taking one thing after
another is one press each. The [inventory](/inventory-box/) and
[trade](/inventory-trade/) panels give their things and places as controls.

`<tosi-b3d>` uses it on its open panel. The keyboard: **Tab** and shift-Tab
cycle, then Enter or space presses and the arrow keys move as the D-pad
does, until the mouse is used. A gamepad: hold D-pad up to reach the system
bar, step along it, **B** opens a panel and presses its controls; hold up in
a panel to close it (back to its button on the bar), and on the bar to go
back to playing. A panel that pops up while the pad is what you last used
takes the pad at once, and hold up closes it straight back to playing. A
modal (the pause, a respawn) takes the focus from whatever it covers, on
its first button.

```javascript
import { padNavigator } from 'tosijs-3d/pad-ui'

const nav = padNavigator(() => panel.controls())
nav.focusDefault() // the panel opened: its default button, else the first
nav.move(0, 1)     // the next control (the last cycles to the first)
nav.move(1, 0)     // a slider up a step, a caret right
nav.activate()     // press it
nav.focused        // the control with focus, its box to draw a ring round
```
