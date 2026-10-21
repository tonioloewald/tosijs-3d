# 0.6.0

<!--{ "parent": "CHANGELOG", "order": 9994000 }-->

Cut as rc.1 → rc.3 (each reviewed; rc consumers see the per-rc sections in git
history), finalized after the nine-lens review's follow-up fixes landed.

The **SVG UI surface** release: a first-class, VR-ready UI substrate — container,
overlay, widgets seam, table, keyboard — plus the interaction contracts that make
the same surface work identically in the DOM, on a 3D plane, and under an XR
controller ray. No peer-dependency changes.

## Added

- **`box`** — the flow container: blocks + inline items + wrapped text, background/
  border/radius, resize-with-reflow, scroll regions, a coordinate-based event model
  (press/activate, raw capturing `handlePointer` for drags), and D-pad focus
  traversal with a visible ring.
- **`surface`** — content box + overlay layer: cascade **menus** and persistent
  draggable/closable **panels**, `placePopup` flip/clamp positioning.
- **`widget-box`** — the seam that lets `widgets3d` controls (sliders, toggles…)
  live inside a `box`/`surface` unchanged.
- **`table` / `table-layout`** — sticky header, virtualized body, drag-to-scroll,
  icon **selection** (see `selection`), D-pad row traversal with the escape
  contract.
- **`keyboard` / `key-layout` / `text-edit`** — the on-screen typing surface for a
  headset: long-press accent strips (sticky on lift, generous ray-tolerant taps),
  spacebar caret-trackpad (slow taps still type), pressed-key tint, hold-signifier
  glyphs (▾ accents, ↔ caret drag), per-key D-pad focus; `inputField` with
  code-point-correct editing and the **receiver-caret** model (lit = where text
  lands, dim = not; `setActive`/`onFocus` for host exclusivity). `key-layout` grew
  `numpad`/`dial`/`email`/`url` modes, gap-absorbing multi-unit keys (equal units ⇒
  equal width), and vertical key spans (the numpad's tall enter).
- **`gamepad-focus`** — the D-pad → focus wire: edge-triggered with typematic
  repeat (pure, testable `createFocusPulse`), menu/A activates, and `claim` scopes
  one physical pad to the last-touched UI when several live on a page.
- **Inner-focus protocol** on `BoxChild`/`Widget3d` — `focusMove(dx, dy) → boolean`
  (false = focus escaped, host moves on), `focusActivate`, `focusClear`, `setState`
  reflection — so a composite widget (the keyboard) is one child but many focus
  stops.
- **`panelScene`** — dual-presentation in two lines: textured plane + orbit camera
  - pick routing (mouse AND XR-controller ray) → `handlePointer`, with one gesture
    contract: a `claim(x, y)` policy for orbit-vs-UI, gestures collected on a stable
    catcher quad via the **pick ray** (screen coordinates don't exist in a headset),
    mapped through the gesture-start frame so a target that rescales its own plane
    stays stable, camera-yield during claimed presses, off-plane release ends the
    gesture.
- **`svgIcons.resize`** glyph (from tosijs-ui), used by the resizable-box demo's
  in-corner grip.

## Changed

- **`b3dSvgPlane`** routes the texture's alpha to the mesh (`opacityTexture`) —
  transparent svg regions (outside rounded corners) are transparent on the plane,
  not an opaque black substrate.
- Pick-forwarded events (`pointerEvents: 'on'`) carry a **synthetic pointerId**,
  never the physical pointer's — a listener's `setPointerCapture` on a forwarded
  event can no longer hijack the real mouse/ray stream.
- Panel demos are side-by-side DOM + 3D (50/50) throughout, built on `panelScene`.

## Fixed

- **The lost-pointerup chain**: demos passing `pointerEvents: false` were silently
  running with forwarding ON (tosijs discards wrong-typed prop writes — filed as
  tosijs#24); the forwarded events carried the real pointerId, so the flat mirror
  captured the physical mouse and the canvas stopped receiving pointerups. Fixed at
  every layer, and routing is now **self-healing**: a fresh down while a gesture is
  outstanding flushes the stale gesture (keyboard/box/surface), so a lost up costs
  nothing instead of wedging the session.
- **`SvgTexture`**: a failed rasterize no longer freezes the plane for the session
  — the busy latch always releases and the frame retries on the next tick.
- Keyboard: accent strips stay inside the keyboard's rect (top row opens below the
  key); a strip tap can't fall through to the key behind it; releasing on the held
  key with jitter goes sticky instead of inserting a random accent; focus follows
  the click (ring on the tapped key); Space presses the focused key.
- Arrow keys no longer orbit demo cameras (`ArcRotateCameraKeyboardMoveInput`
  removed — arrows drive the UI).

## Added (post-rc, from the review follow-ups)

- **`ui.*` namespace** — the SVG UI family's value exports live on one
  container (`ui.box`, `ui.table`, `ui.keyboard`, …): common nouns don't leak
  from the barrel. Types stay top-level. Migration from any rc:
  `import { ui } from 'tosijs-3d'` and destructure.
- `Box.interactiveAt` / `Surface.interactiveAt`, and `panelScene`'s **default
  claim policy** asks them — pressing a button/panel claims the gesture,
  pressing static prose orbits the camera, consistently across every demo.
- `panelGesture` + `uvToViewBox` + `planeLocalToViewBox` exported pure (the
  gesture contract is unit-pinned); named option types (`TableOptions`,
  `KeyboardOptions`, `InputFieldOptions`, `PanelSceneOptions`,
  `GamepadFocusOptions`); `panelScene` takes `updateInterval`; `w3dTheme`
  (one place reads the `--w3d-*` variables).

## Fixed (post-rc)

- `table.focusMove` speaks the protocol's `(dx, dy)` (rc.1 trapped D-pad focus
  in a hosted table); menu leaf-select no longer destroys persistent panels
  (`Surface.closeMenus`).
- box hover no longer sticks on raw children; a claimless `gamepadFocus`
  instance is no longer starved (click-away releases the claim).
- Table scrolling within the window is transform-only and hover restyles
  surgically (the virtualized body no longer rebuilds per drag-move);
  `textBlock` caches its wrap per width.
- `SvgTexture` warns once per instance when rasterizes fail (self-healing had
  made it silent); deploy/tunnel host reads `TOSIJS_DEPLOY_HOST` instead of a
  committed address.

## ⚠️ Changed

- **`B3d.onResize()` / `B3dHud.onResize()` → `handleResize()`** (the `on*`
  prefix is reserved by the element-creator's listener sugar). A 0.5.x
  consumer calling `onResize()` must call `handleResize()`.
