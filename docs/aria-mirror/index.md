# aria mirror

**A panel a screen reader can use.** A panel draws in SVG, flat or on a plane
in the scene, and a screen reader sees none of it. The mirror is the same
panel as real HTML controls (buttons, checkboxes, range inputs, selects, text
fields), visually hidden, built from the panel's control tree (see
[widget semantics](/widget-semantics/)). Sections are headings with an
expand button, popups are dialogs. Using a mirrored control sets or presses
the panel's own widget through its own path, exactly as an agent's tool or a
hand on it would, so there is one definition of what each control does.

**Placed over what it mirrors.** With `place`, each copy is a real target
laid exactly over its drawn control: unpainted (no background, no text
colour) but fully opaque and, where the main pointer is a finger, taking
touches (with a mouse every press goes through to the drawn panel), because iOS VoiceOver finds what
a finger is on by hit-testing, and skipped transparent, untouchable copies
for the canvas under them. So a person exploring by touch finds "Continue"
where Continue is drawn, and a double-tap presses the copy. A copy with
keyboard focus shows a ring over the drawn control. Without `place` the
copies are hidden in a corner and reached by swiping or Tab.

**Built only when someone uses it.** `<tosi-b3d>` builds nothing for a
screen reader until focus first lands in the scene (Tab, or VoiceOver moving
onto the owl or the scene); from then it mirrors its settings panel and any
modal (a pause: focus moves to Continue), describes the scene and names the
glass gamepad's controls. Values are read again when a copy takes focus;
nothing runs on a timer. Its system bar's buttons are real HTML buttons
already, laid exactly over the drawn bar.

```javascript
import { ariaMirror } from 'tosijs-3d/aria-mirror'
const mirror = ariaMirror(hostElement, () => panel.controls(), { label: 'Settings' })
mirror.update()   // after the panel rebuilds; values patch in place, focus stays
mirror.dispose()
```

What it cannot do yet: a big editor (a curve, a footprint) is read out by name
and value only, unless its value is a few numbers, which become number fields.
In a headset there is no DOM to mirror into.
