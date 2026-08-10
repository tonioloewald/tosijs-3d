# Changelog

All notable changes to **tosijs-3d**. This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes — each is called out in a
**⚠️ Breaking** block in its version section below, with what a consumer must do.

## 0.6.1

First consumer-reported fixes — both filed by **manta-recon** (tosijs-3d's first
external adopter) with root-cause analyses read from the 0.6.0 dist. No API changes.

### Fixed

- **Aircraft chase camera never created when focus adoption lands after a fast
  mesh load** ([#1](https://github.com/tonioloewald/tosijs-3d/issues/1)). Both
  sides deferred to the other: `setupMesh` skipped the camera when
  `inputProvider` wasn't set yet, and `inputFocus` early-returned for any
  self-managed entity — an ordering hole between them left the player flying
  blind on `default-camera`. The focus side now nudges entities using the
  deferral pattern (idempotent `setupFollowCamera`), so whichever side runs
  last completes the setup.
- **fly-by-wire: zero-speed deadlock above `hoverCeiling`**
  ([#2](https://github.com/tonioloewald/tosijs-3d/issues/2)). At full nose-up,
  pitch decay (`diveBoost·sin(pitch)`) could exceed thrust, pinning speed at
  the 0 clamp with the throttle held — a craft frozen mid-air. Held thrust is
  now floored to make progress below `vtolSpeed` (a nose-high climb-out labors
  instead of freezing); the throttle-released zoom-climb stall — the deliberate
  "hard way into high-altitude hover" — is untouched.

## 0.6.0

Cut as rc.1 → rc.3 (each reviewed; rc consumers see the per-rc sections in git
history), finalized after the nine-lens review's follow-up fixes landed.

The **SVG UI surface** release: a first-class, VR-ready UI substrate — container,
overlay, widgets seam, table, keyboard — plus the interaction contracts that make
the same surface work identically in the DOM, on a 3D plane, and under an XR
controller ray. No peer-dependency changes.

### Added

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

### Changed

- **`b3dSvgPlane`** routes the texture's alpha to the mesh (`opacityTexture`) —
  transparent svg regions (outside rounded corners) are transparent on the plane,
  not an opaque black substrate.
- Pick-forwarded events (`pointerEvents: 'on'`) carry a **synthetic pointerId**,
  never the physical pointer's — a listener's `setPointerCapture` on a forwarded
  event can no longer hijack the real mouse/ray stream.
- Panel demos are side-by-side DOM + 3D (50/50) throughout, built on `panelScene`.

### Fixed

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

### Added (post-rc, from the review follow-ups)

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

### Fixed (post-rc)

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

### ⚠️ Changed

- **`B3d.onResize()` / `B3dHud.onResize()` → `handleResize()`** (the `on*`
  prefix is reserved by the element-creator's listener sugar). A 0.5.x
  consumer calling `onResize()` must call `handleResize()`.

## 0.5.2

### ⚠️ Breaking — peer dependency (`tosijs` ≥ 1.7.8)

- **`tosijs` peer range `^1.6.9` → `^1.7.8`.** Consumers must be on `tosijs`
  **≥ 1.7.8**; a project on `1.6.x` will hit `ERESOLVE`. (1.7.6/1.7.7 are
  **deprecated on npm** — a `parts`-resolution regression; 1.7.8 fixes it, and
  tosijs-ui 1.7.4 requires it.) As with 0.5.1, this ships under a **patch**
  deliberately — `0.x` narrative versioning, with `0.5.0` reserved for the
  playable-game cut — so it's flagged here rather than forced to a minor.
- _Dev/build only, no consumer action:_ `tosijs-ui` `1.6.23` → `1.7.4`, and
  `chokidar` added to `devDependencies` (tosijs-ui 1.7.x's shipped doc-site
  pipeline imports it at runtime but declares it dev-only — filed upstream).

### Added

- **`svgIcons`** (`svg-icons.ts`) — an SVG **icon proxy** (`svgIcons.<name>()` →
  an SVG `ElementCreator`) over a focused, **generated** icon set
  (`icons/{color,stroked,filled}/*.svg` → `icon-data.ts` via tosijs-ui's
  `tosijs-make-icons`; `bun run icons`). A composition-suffix subset
  (rotate/flip/scale/translate/opacity/stroke-width/colour) + the generator's
  directional redirects + hand-authored aliases (`iconAliases`, e.g.
  `moreHorizontal`). ~30 icons incl. `tosijs3d`, `xrColor`, `tosiXr`, keyboard,
  checkbox/stats/status marks.
- **`iconGlyph`** — a **texture-safe** icon primitive (explicit-colour SVG `<g>`)
  for embedding icons in in-scene `widgets3d` / `SvgTexture` UI, where
  `currentColor` and CSS vars don't resolve in the raster.
- **`flowLayout`** (`flow-layout.ts`) — a pure **CSS block/inline-block flow**
  layout core: the substrate for a first-class SVG UI surface that lives in the
  DOM and on a 3D texture. Babylon/DOM-free, unit-tested.
- **`b3d.snapshot()`** — capture the current view as a PNG **data URL**
  (resolution-independent, via Babylon's render-target screenshot; works flat,
  including in-scene panels).
- **`icon-name.ts`** — the pure composition-suffix parser behind `svgIcons`.

### Changed

- **Scene chrome → icon lozenge.** The top-left toolbar is now one rounded pill
  with two `svgIcons` buttons (settings + `xrColor` Enter-VR); the scene-panel `×`
  close is a `close` icon. The doc-browser **header logo** = `tosiXr` and the
  **favicon** = the teal cube, both via tosijs-ui 1.7.4's new `logo` option.
- **README** gained a 280px logo and its stale `xinjs-3d` links were fixed.

### Fixed

- **keyboard icon** rendering — the generator strips `fill-rule` from non-`color`
  icons, so its evenodd key-holes broke; moved to `color/` with `currentColor`
  (filed upstream). `iconGlyph` bakes `currentColor` to an explicit colour so it
  renders in the texture raster too.
- **Lozenge visible without `:has()`** — it defaulted to `display:none` and
  revealed via `:has()`, so a browser lacking `:has()` (older Firefox) never
  showed the toolbar. Now default-visible; `:has()` only suppresses the empty-pill
  flash.
- The svg-icons "composition suffixes" snippet is a **static** code block (was an
  erroring live example).

## 0.5.1

### ⚠️ Breaking — renamed public methods (`on*` → `add*Listener` / `handle*`)

No peer-dependency changes this release. The break is a **method rename**: tosijs's
`elementCreator` treats any `on<Event>`-named member as `addEventListener` sugar and
**shadows** a component method of the same name (it now fires a live warning, and it was a
latent bug — the handler silently never ran). So the multi-listener subscribe methods and the
lifecycle hooks moved off the `on*` prefix. The new names are also more honest: the subscribe
methods **push to a listener list** (add/remove semantics), not a single-handler setter.

| Old (0.5.0)                            | New (0.5.1)                                  | On                                 |
| -------------------------------------- | -------------------------------------------- | ---------------------------------- |
| `onSceneAddition` / `offSceneAddition` | `addSceneListener` / `removeSceneListener`   | `B3d` (scene owner)                |
| `onOriginShift` / `offOriginShift`     | `addOriginListener` / `removeOriginListener` | `B3d` (scene owner)                |
| `onGainFocus` / `onLoseFocus`          | `handleGainFocus` / `handleLoseFocus`        | `B3dControllable`                  |
| `onButton`                             | `handleButton`                               | `TouchGamepadSource`, `B3dGamepad` |

**What a consumer must do:** if you wrote a custom scene child that called
`owner.onSceneAddition(cb)` / `owner.onOriginShift(cb)`, or subclassed `B3dControllable` and
overrode `onGainFocus`/`onLoseFocus`, or a gamepad source with an `onButton` callback, rename to
the new members. It's a pure rename — signatures are unchanged. Built-in components are all
migrated; this only affects code you wrote against these surfaces.

### Added

- **Coordinate-free `MinSimApi`** (`world-contract.ts` §8) — a world-simulation boundary where
  **coordinates never cross the membrane**: a driver (an AI narrative engine, a scripted demo)
  sees _topology + a qualitative distance ladder_, never `x/y/z`. Places, portals, a 7-rung
  proximity ladder (`same-spot`…`present`, `elsewhere` for a different place), a `SchematicView`
  ("where am I", exits, contents-with-rung), and `route()`. `WorldStore` now implements it
  alongside its existing surface — the sim keeps real geometry sim-private and answers only in
  qualities.
- **`world-topology.ts`** — the pure, Babylon-free, deterministic spatial math behind the
  surface: `proximityRung(distance, extent)` (a distance in, an adjective out; bands scale with
  a place's `extent`), `rungNominal` (the inverse, for placement), `routePortals` (cheapest
  portal path, bidirectional, locked portals impassable — Dijkstra, deterministic tie-break),
  `containmentPath` (root→here breadcrumb). Unit-tested without a store or an engine.
- **`min-sim-conformance.ts`** — a **framework-agnostic shared conformance kit**
  (`runMinSimConformance(makeApi, harness)`) that pins the contract behaviour identically for
  any `MinSimApi` implementation. It imports no test runner (so it ships in the library) and
  takes the `describe`/`test`/`expect` harness as an argument — the same kit runs in this repo
  and in a driver's repo (the Ariosto use case), proving both stores behave the same at the seam.
- **Clouds drift with wind** — the cloud layer now moves with the wind vector, so the sky is
  alive rather than a still image.

### Changed

- **Demo cameras** migrated to a shared `demo-utils` `orbitCam` helper (tilt-clamped so an orbit
  can't dip below the horizon) instead of 24 hand-rolled per-demo cameras. Authoring-only — no
  library-API impact.

### Fixed

- **Cloud whiteout** now behaves correctly: it ramps to full **earlier** (less "snaps on at the
  moment of entry", denser once inside), **blots out the sky** (not just scene geometry), and
  **mutes projected cloud shadows** under the whiteout (fogged fragments no longer darken through
  the fog).
- **`b3d-controller`** `player` now defaults to `false`. tosijs began **throwing** on an
  `initAttributes` boolean that defaults to `true` (an absent HTML boolean attribute is `false`,
  so a `true` default can never turn on) — the old `player: true` default made the controller
  throw at construction and silently never wire input.

## 0.5.0

### ⚠️ Breaking — peer dependencies

- **Babylon.js 8 → 9.** Peer range for `@babylonjs/core`, `@babylonjs/gui`,
  `@babylonjs/loaders`, `@babylonjs/materials` moved `^8` → `^9`. **Consumers must
  upgrade their Babylon to `9.x`.** A project still on Babylon 8 will hit an
  `ERESOLVE` on install.
- **Jolt physics `^1.0` → `^1.1`** (Jolt 5.6.0 — the friction model moved). Only
  relevant if you use `<tosi-b3d-physics>`; retune friction if grip/slide changed.
- **Packaging fix:** `@babylonjs/*` and `jolt-physics` are now **peer-only** (they
  were previously declared in both `dependencies` and `peerDependencies`). A hard
  Babylon dependency would nest a _second_ engine copy in a consumer holding a
  direct Babylon dep — silently breaking `instanceof`, engine singletons, and
  plugin registration. No action needed by consumers; this just makes install
  resolution correct.

### Added

- **Clouds** (`<tosi-b3d-clouds>`) — an opaque blob cloud layer you can _fly into_
  and lose the world inside (a fog whiteout, not a texture). A `coverage` weather
  dial from wisps to thunderheads, and `insideCloud` so a cloud is a _tactic_
  (break a radar lock, shake a pursuer).
- **Projected cloud shadows** (`cloud-shadows.ts`) — the field painted top-down
  into one texture, sampled by world position in a material plugin, so shadows
  conform to terrain and fall on elevated receivers (the aircraft) too. Reusable.
- **Shadow decals** (`shadow-decal.ts`) — a reusable soft blob-shadow for a single
  caster (character, vehicle, dropped item).
- **Death** (`<tosi-b3d-death>`) — death's exit: explode + burning wreckage,
  release input, a third-person spectate shot, then a respawn panel. Flat and VR.
- **Encounters** — `<tosi-b3d-spawner>` (seeded, "same seed, same battles"),
  `formations.ts` (pure placement math), and a named `prefab` registry with
  `spawnPrefab` for the set-dressing a death or spawn drops.
- **Ambient effects** (`<tosi-b3d-ambient>`) — device-budgeted garnish (motes,
  bubbles, tumbling leaves) that competes for one pool and switches **off** rather
  than thinning into a lie. Pure budget allocator in `ambient-budget.ts`.
- **Atmosphere** (`atmosphere.ts`) — pure fog compositing so underwater / cloud /
  space whiteouts layer over the base fog instead of fighting it.
- **`setGameplayCamera`** — an XR-safe viewpoint affordance (move the rig in a
  headset, swap the camera when flat), so chase/death/vehicle transitions stop
  breaking in VR.
- **`PLATFORM.md`** — the platform bet (stay on the web, don't abstract the
  renderer; the real risk of the Android XR / Vision Pro shift is _input_).

### Changed

- **Aircraft** — the stick is dead on the ground (only the throttle lifts off);
  you can't crash-land until you've actually cleared the pad; chase camera banks
  smoothly and no longer jitters on throttle.
- **Water** follows the camera as an endless sea; **terrain** auto-centers so a sea
  at `y=0` floods the valleys.
- **HUD** survives respawn.
- Babylon `8.56 → 9.16`, Jolt `1.0 → 1.1`, tosijs-ui `1.6.22 → 1.6.23`, tosijs
  `1.6.8 → 1.6.9` (dev-server/haltija reliability), haltija `→ 1.4.0`.

### Fixed

- Death explosion/wreck FX land at the real wreck; a respawn is no longer charred
  (char a cloned material, not the shared library one).
- The aircraft ground-ray no longer picks a cloud blob as "ground" (mid-air
  "crash"); cloud whiteout is opaque under LINEAR fog and builds from every
  direction; the live-debug timer is cleared on scene disconnect (no leak).
