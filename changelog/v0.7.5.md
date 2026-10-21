# 0.7.5

<!--{ "parent": "CHANGELOG", "order": 9992995 }-->

## Added

- **`iconGrid3d` — segmented select, tool palette and mode picker in one.**
  Three widgets collapse into one because the difference between them was never
  layout, it was **semantics**: the grid owns layout, hit-testing and focus, and
  `handleChange` lets you impose your own rule. It receives what _would_ happen
  and returns what should; returning `previous` is the veto, because one way to
  say no is easier to get right than two.

  Cell size is two cases — 48px touch, 24px pointer, from `(pointer: coarse)`.
  **XR is deliberately not a third size**: growing targets in UI units leaves the
  glyphs where they are and inflates the buttons around them, buying hit accuracy
  by making the panel harder to read. Scale the panel in world space instead and
  both move together.

- **An on-screen keyboard you can summon.** `inputField` draws a ⌨ affordance,
  and it is a **toggle** for a shared preference rather than a one-shot: you are
  not asking for a keyboard once, you are saying that reaching a real one is
  inconvenient, and that stays true for the next field. Auto-open follows the
  same preference (`autoKeyboardEnabled`/`setAutoKeyboard`, both exported).

  The glyph is always drawn because the DEVICE cannot tell you whether a keyboard
  is within REACH — a console, a laptop docked to a screen across the room, a
  headset with a desk under it. Sniffing gets all of those wrong in the same
  direction.

  **Caps lock by holding shift.** A tap stays one-shot; a hold locks; a tap while
  locked unlocks. The key tints accent while locked, because a mode you cannot
  see is a mode you will be surprised by.

- **Popups can escape their panel — a real layer, in both presentations.**
  `panel3d.useDomLayer(container)` mounts flat popups as positioned siblings
  outside the panel's `<svg>`; `panelScene` mounts them as their own plane, with
  genuine z-separation. A layer belongs to a PRESENTATION, and there are two of
  them, so `showLayer` fans out and closing closes both — one popup wearing two
  faces, exactly as the panel already is.

- **`data-presentation` — one UI, two appearances.** Mark a node `dom` or
  `texture`: `svg-texture` strips `dom`-only nodes when it rasterises, and the
  DOM layer hides `texture`-only ones by stylesheet (a serialised SVG inherits no
  page CSS, which is what makes that work). Popup chrome uses it — the move and
  close glyphs are handled by picking, which exists only in the scene, so flat
  they were decoration you could press with no effect.

  It deliberately cannot make a widget _behave_ differently between
  presentations. Differing in what you draw is safe; differing in what you do is
  how the two drift.

- **`select3d` opens a menu from its value**, keeping its steppers. Nudging to
  the next option while watching it is a different gesture from picking a named
  one out of a list, and a stepper is better at it.

  This needed a seam: a widget cannot reach its own panel, because it is
  constructed before the panel that will hold it. `Widget3d.setHost()` and
  `WidgetHost` (`showPopup`/`showLayer`/`closePopup`/`bounds`/`top`/`hasLayer`)
  are that seam.

- **A kitchen-sink demo and an overview on the UI page**, with the doc order
  sorted so features come first and the pure models sort to the bottom.

## Changed

- **The scene-panel button wears the tosijs-3d owl**, not a gear. The
  `scenePanelGear` part name is unchanged — a consumer may be styling it, and a
  part is an anchor rather than a description.
- **Keyboard keys use SVG icons** for enter, backspace and shift instead of
  unicode glyphs. A codepoint is at the mercy of whatever font the panel
  resolved, and a rasterised texture is its own document with its own fallback,
  so `⏎` could arrive as a box.

## Fixed

- **Nested panel pointer events were handled twice** — once by the inner panel,
  then again when they bubbled to the outer one, which routed them back in by
  coordinates. A tap survives that; a HOLD does not, so press-hold-drag on the
  spacebar never fired in the DOM (3D worked, because a texture has no DOM
  events).
- **`vector3d` did not forward its host**, so the fields inside a coordinate row
  could never summon a keyboard — and therefore never showed a numpad.
- **The keyboard follows focus** between fields, and its layout reverts: a
  takeover cleared the shared record but not the previous owner's, so returning
  to a text field left the numpad up.
- **It dismisses** when the host makes something else the receiver
  (`setActive(false)`, which is distinct from `focusClear` — D-pad focus moving
  on does not stop text arriving).
- **Placement follows the FIELD, not the panel**, and the scene layer no longer
  clamps to the panel: a plane is not cropped by anything, so a keyboard for a
  field low in the panel hangs below it rather than being pushed up over the
  field it types into.
- **The popup close target no longer shrinks with its glyph.** `chromeHit` tests
  a boundary, not the glyph box, so making the × smaller quietly made it harder
  to hit — wrong for a controller ray. The target is now sized on its own terms.
- **The return key drew a box.** `icons/stroked/corner-down-left.svg` is an
  18-byte file containing the TEXT `cornerDownRight0f` — a mirror reference that
  `svgIcons` resolves and `iconGlyph` cannot. The icon guard now checks that a
  name RENDERS, not merely that it exists.
