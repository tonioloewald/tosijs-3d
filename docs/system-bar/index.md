# system-bar

**The scene's system bar: one row of buttons, flat and in a headset.** Flat it
sits in the top-left corner of the screen; in a headset, up ahead where the
settings panel used to hang. It opens the scene's settings panel (the owl),
the panels you put on it (a `<tosi-b3d-panel icon="personStanding" title="Inventory">`
with what it shows inside: it opens under the bar), and carries Enter or Exit VR and
full screen. One UI, arranged a little differently on each.

It does not re-implement its buttons. It MIRRORS a list of real HTML buttons:
a button that is hidden (by its `hidden` attribute or by a style, such as
`::part(enterVrButton) { display: none }`) is not drawn, one that is disabled
is drawn dimmed and ignores a press, its icon and title come along, and a press
calls that button's own `click()` (held for `HOLD_MS`, it gets a `systemhold`
event instead: the scene puts that button's panel back where it started). So entering VR and going full screen keep
their one definition, and both still run inside the press the browser requires
for them. `<tosi-b3d flat-ui="dom">` keeps the HTML ones flat.

```javascript
import { systemBar } from 'tosijs-3d/system-bar'

const bar = systemBar([gearButton, vrButton, fullscreenButton])
// bar.svg: give it to a frame panel (its handlePointer is on it)
// bar.dispose(): stop watching the buttons
```
