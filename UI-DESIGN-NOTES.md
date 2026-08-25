# UI / XR UX Design Notes

A living log of our UI-and-XR decisions, experiments, tradeoffs, and lessons
learned — the widget system (`widgets3d`), spatial panels (`xr-frames` /
`frame-panel` / `b3d-panel`), SVG textures, gamepad surfaces, and immersive UX
in general. This is the _why_ behind the code; the code is the _what_.

**Keep this up to date.** When we make a UI/XR call — pick an approach, hit a
wall, reverse a decision, learn a Quest quirk — add a dated bullet under
_Timeline_ and, if it's a durable rule, fold it into _Principles_. Prefer
appending over rewriting so the reasoning trail survives. Convert relative dates
to absolute.

---

## Principles (current best understanding)

### One UI, two presentations — divergence is a bug until proven otherwise

The scene panel is **not** "a flat panel and an XR panel". It is **one widget list with two
presentations** (a DOM overlay, and an `SvgTexture` on a plane). Treat any difference
between them as a defect unless it's justified and confined:

- **Behavioural drift is a bug.** If a control exists in one presentation it must work in
  the other. (We shipped a perf section that auto-expanded in XR but sat collapsed behind a
  button flat — nobody decided that; it accreted.)
- **Divergent MECHANISMS breed divergent bugs, and that's the dangerous kind.** The flat
  panel could rebuild (`refreshScenePanel`) and the XR panel could not — so the XR side grew
  its own "refresh" that swapped the SVG's children in place. That quietly detached the
  pointer/scroll closures `panel3d` hangs off the element, and the panel became
  untargetable **only in XR, only in some scenes**. The drift wasn't cosmetic; it was the
  root cause.
- **One widget list (`_panelWidgets`), one repaint entry point (`_repaintPanels`).** Both
  presentations build from the same rows and are repainted together. If you find yourself
  adding an `if (xr)` inside the widget list, stop — that's the drift starting.
- **XR-only rows are allowed, but they must be ADDITIVE and live in one place** (Exit VR,
  Re-seat — things that are meaningless flat, where the OS chrome does the job). They are
  appended at the XR mount site, never branched into the shared list.
- **Status before controls.** Debug/diagnostic rows render first. A readout below the fold
  is a readout you can't read — and if the panel's own picking is broken, you can neither
  press nor scroll to it.
- **Never gate the escape hatch on the thing that might be broken.** Scrolling was gated on
  the panel ray-pick, so when picking broke you couldn't press _or_ scroll — including to
  the diagnostics explaining why. Scroll is gaze-gated now.

### SVG-native UI, not HTML

- Widgets (`widgets3d.ts`: `panel3d`, `slider3d`, `toggle3d`, `select3d`,
  `button3d`, `list3d`, `label3d`, `text3d`) render to **SVG, not HTML**, so the
  _same_ widget works as a flat DOM overlay **and** in-scene on an
  `SvgTexture`/`b3dSvgPlane`. HTML-in-`<foreignObject>` does **not** rasterize
  reliably to a texture — that's the whole reason for the SVG constraint.
- Widgets bind to plain values **or** tosijs reactive proxies; a `slider3d` and
  a native bound `<input>` on the same proxy stay in sync.
- Layout protocol: the container gives each widget a content **width**; each
  widget lays itself out and returns the **height** it needs; the container
  stacks and becomes scrollable (wheel + drag) on overflow.

### Interaction is coordinate-based, so it survives XR

- Pointer hits on a textured mesh map **mesh UV → SVG viewBox coords →
  `handlePointer`** (not DOM events). This is what lets the same panel/gamepad be
  driven by an XR controller/mouse pick inside a headset.
- `TouchGamepadSource` went coordinate-based (`handlePointer`) specifically to be
  VR-ready; SVG elements are identified by `data-part` (not `id`) so multiple
  instances coexist.
- **Thumbstick scroll on pointed-at VR panels (DONE).** When a controller's ray
  hits a scrollable panel in VR, that stick's Y scrolls it and is withheld from
  locomotion for the frame (pointing precisely + drag-scrolling is fiddly in a
  headset). `panel3d` exposes `scrollBy(dy)` + a `scrollable` flag;
  `_attachXrPanel` exposes the plane; the XR loop ray-picks each controller and
  routes the stick. General principle: in VR, prefer **coarse, always-available
  inputs (sticks)** for panel actions over precise pointing/dragging.

### Spatial UI is NOT XR-only (fixed)

- A frame panel gaze-reveals off `scene.activeCamera`, so nothing about it is
  inherently XR — it works on a monitor too. **NPC nameplates** (`EntityFrame` +
  `attachFramePanel`) now render in flat AND XR via a general `_setupNameplates`
  manager (out of the XR-only `_startDefaultXrExperience`), updated each rendered
  frame (`onBeforeRenderObservable` fires in both). Lesson: build spatial UI
  camera-agnostic (active camera, one update path) from the start — don't wire it to
  the XR camera/loop. Other xr-frames UI (dialogue balloons, lock-on brackets)
  should follow the same pattern.

### Attach UI to a _stable frame of reference_ (`xr-frames`)

- "Stable" in XR isn't one thing. Pick the frame that matches the stability you
  want: `world` (table hologram), `rig` (piloting HUD that flies with you),
  `body` (waist/over-shoulder inventory), `neck` (look-past UI), `face`
  (reticle/vignette, head-locked), plus sensed hand/wrist frames.
- Panels are **fixed within their frame — they do NOT billboard**. The _frame_
  moves (e.g. `body` follows the torso), the panel rides along, oriented once to
  face the head. Billboarding reads as floaty/unstable.
- `body`/`neck` aren't sensed in a head+hands rig — they're **inferred**: `body`
  low-passes head yaw (sustained turns move it, quick glances don't) and sits at
  floor level under the head. `gazeReveal` shows a panel as you look toward it.
- Cockpit/vehicle: **literally parent the rig to the hull** — don't hand-roll
  quaternions. **Decompose the hull world matrix** to avoid scaled-frame
  distortion. **Recenter the camera, not the panels**, to look out the nose.

### Dual-presence controls — the `scenePanel` hook, not an HTML overlay

- `b3d({ scenePanel: (host) => Widget3d[] })` renders the SAME reactive controls
  BOTH as a flat ⚙ gear overlay AND as a floating in-VR panel. Prefer this for
  any tweakable in-scene setting so it works inside the headset.
- Keep only pure readouts / text entry (no VR keyboard) as slim flat overlays.
- The flat panel **rebuilds each time the gear opens** so hooks that read async
  state (e.g. a library mesh list) stay current; `refreshScenePanel()` updates an
  already-open one. Tradeoff: freshness vs. redraw cost — rebuild on open is
  cheap and correct; don't rebuild every frame.

### Changing the viewpoint: NEVER swap `scene.activeCamera` in a session

This bit us three times (chase camera, death orbit, and it will hit vehicle enter/exit) — so the
rule now lives in ONE place, `B3d.setGameplayCamera(camera)`:

- **In an XR session the WebXR camera OWNS the view.** Setting `scene.activeCamera` to anything
  else steals it from the headset and blanks the display. So `setGameplayCamera` swaps the camera
  **flat only** and is a **no-op in XR**, returning `false` so the caller can skip building a
  flat-only camera rig entirely (see how `b3d-death` disposes its orbit cam when it returns false).
- **Every gameplay camera change routes through it** — chase↔cockpit (`b3d-aircraft.setCameraView`),
  death spectator, and vehicle enter/exit. Nothing calls `setActiveCamera` / `scene.activeCamera`
  for gameplay. (`setActiveCamera` stays the low-level primitive for the ONE initial setup camera
  and for XR-internal use.)
- **In XR you move the RIG, not the camera.** The piloted entity parents the XR rig to itself so
  the head rides along (cockpit = rig parented to the hull; see `xr-frames` `rig` frame and the
  "parent the rig to the hull" note above). "Changing viewpoint" in XR = re-parenting/re-seating
  the rig, never swapping cameras.

**The next case is vehicle enter/exit** (there's a parked plane in the b3d test scene waiting for
it). The clean shape, reusing this affordance:

- **Flat:** `setGameplayCamera(vehicle.cockpitCamera)` on enter, `setGameplayCamera(biped.followCamera)`
  on exit — the no-op-in-XR guard is automatic.
- **XR:** re-parent the rig from the biped frame to the vehicle's cockpit node (and back on exit) —
  one "re-seat the rig on this node" primitive, which `b3d-input-focus`'s enter/exit already has the
  hook points for. Worth extracting that as `B3d.seatRig(node | null, offset)` so death (leave the
  rig where the head is), cockpit (rig on hull), and vehicle-enter (rig on cockpit) all share it —
  the rig counterpart to `setGameplayCamera`.

**Open VR items (need a headset to finish):**

- **Death panel is head-locked** — it's a `b3d-svg-plane` with `cameraRelative`, which parents to
  `scene.activeCamera` = the head in VR, so it swims with your gaze and sits behind the global
  panels. Should pin to the `rig` frame, front-and-centre. Needs `b3d-svg-plane` to accept a frame
  to parent to (or the death panel to manage the reparent once the plane mounts).
- **Death wreckage/explosion + the flat orbit** — reported not visible in VR; diagnose on-device
  (the FX are scene-side and should render; the orbit is correctly flat-only now).

### Avoid window-`rAF`-driven animation in immersive sessions

- `window.requestAnimationFrame` is **suspended** during an immersive session
  (the compositor owns the frame clock via `XRSession.requestAnimationFrame`).
  tosijs's to-DOM binding flush is window-rAF-batched, so **DOM projection of
  reactive changes freezes in VR** — the data is current, its DOM/attribute
  reflection is not. `<tosi-b3d>._installXrRafPump()` shims window-rAF to enqueue
  callbacks and drains that queue from `onXRFrameObservable` each XR frame. **On
  session exit** it restores the real `window.requestAnimationFrame` and calls
  `pump()` one final time, so anything enqueued in the last frame isn't stranded
  (`tosi-b3d.ts` ~636–668). Both halves matter: transfer updates to the XR clock
  in-session, and flush + restore on exit.
- Consequence for UX: **anything else batching on window-rAF (tweens, other
  animation libs) freezes the same way.** Lean on direct reactive value binding +
  the XR pump; be wary of animation-driven UI in a session.

### Textures & redraws — don't leak, don't over-draw

- `SvgTexture` dynamic mode polls a live SVG element on an interval (default
  30 ms). **Always `dispose()`** to stop the interval and free GPU memory.
- **VRAM across XR sessions:** the Quest browser does **not** reliably release
  WebXR GPU resources between enter/exit — repeated sessions can exhaust VRAM
  (reticle → checkerboard). Our per-session teardown IS complete (verify any new
  per-session resource is disposed there), but browser retention isn't ours to
  fix, so **keep baseline XR VRAM low**: render scaling, modest panel/texture
  resolution, no redundant dynamic textures.
- Poll intervals and full-texture rerenders are the expensive path — update on
  change/open, not on a tight timer, where we can.
- **`XRQuadLayer` is the promising direction for UI planes** (not yet tried).
  WebXR compositor layers hand a texture straight to the headset compositor
  instead of us texturing a mesh rendered through the scene — potentially crisper
  text (no scene-resolution resampling / render-scale penalty), lower per-frame
  redraw cost, and better VRAM behaviour. Candidate replacement/upgrade for
  `b3dSvgPlane`-backed panels. Open question: pointer picking — compositor layers
  aren't scene meshes, so our UV→SVG-coords pick path needs a separate ray/quad
  intersection to keep interaction working.

### Reticle state can encode gameplay (turret reachability)

Beyond position/scale, the reticle's **color encodes state**. First use (aircraft
combat MVP): the two waist turrets have **limited traverse/elevation**, so the
player's look direction may be **out of arc** — the reticle goes **green when a
turret can bear** there, **red when it can't** (optional amber = only one of the
two). The turret aiming helper returns a **can-bear** flag; the reticle just reads
it. General principle: the reticle is a cheap, always-in-view status channel — lean
on **color/shape**, not extra HUD, for "can I act here?" feedback. (Combat spec:
`COMBAT-DESIGN.md` → Turret → Control modes.)

### Control assignments — GTA V as the de-facto-standard north star

When in doubt about which control does what, **conform to the de-facto standard so
players don't have to relearn per game** (the "is the accelerator X or right-trigger?"
tax). **Our north star is GTA V** — match its gamepad/keyboard conventions (drive/aim/
fire/enter-vehicle/camera) unless there's a strong reason not to, and note the reason
when we deviate. Consistency across our own entities (biped/car/aircraft/turret) matters
as much as matching GTA.

But **standard gamepad ≠ available in VR**: XR controllers have far fewer buttons than a
console pad. So every essential action needs a **VR-reachable fallback**:

1. Prefer mapping essentials onto what VR _does_ have — two sticks, two triggers, two
   grips, and a couple of face/menu buttons per hand.
2. When actions outnumber buttons, put the overflow (and anything non-time-critical)
   into the **overhead / spatial menu** (`xr-frames` panels — inventory/quick-access/
   menu) rather than inventing an obscure chord.
3. The flat controller can be richer (full pad / keyboard), but the VR mapping is the
   **constraint that shapes the scheme** — design the control set to degrade gracefully
   from full pad → XR controllers → spatial menu, not the other way around.

(First bite: combat demos fire on `shoot` **or** `sprint` so the right trigger works;
`b3dController` + the glass gamepad's `controls` spec keep the on-screen set minimal.)

### Dead ends — don't revisit

- **WebXR DOM Overlay is a joke — not worth exploring.** (Ruled out
  2026-07-02.) It doesn't give us usable in-scene spatial UI; our SVG-on-a-plane
  - `xr-frames` approach is the path. Revisit only if the spec/implementations
    change materially.

### Styling & materials discipline

- Use tosijs's CSS facilities (`StyleSheet`, `lightStyleSpec`/`shadowStyleSpec`,
  `vars`/`initVars`) — never hand-rolled `createElement('style')` or CSS strings.
  (`glass-gamepad` was refactored onto `StyleSheet` for exactly this.)
- Model frame hygiene: `canonicalize`/scale-bake (`model-transform.ts`) so a
  spawned model has a clean unit-scale frame — matters when parenting cameras/UI
  to it, since a scaled frame skews forward/up.

---

## Timeline / experiments (most recent first)

_2026-07-13_

- **The panel became untargetable in VR — and it was a drift bug wearing a physics
  costume.** Symptoms: in the terrain demo the controller beam hit the panel but the dot
  landed elsewhere (sometimes ~10px off, sometimes wildly), nothing was clickable
  (Exit VR included), scrolling was dead, and it was _intermittent_ — re-entering VR
  sometimes gave a perfectly working panel. The aircraft was suspected (cockpit rig,
  moving carrier, floating origin) and exonerated: the same aircraft was fine in the
  combat demo.
  **Cause:** a "refresh" that called `panelEl.replaceChildren()`. `panel3d` hangs
  `handlePointer` / `scrollBy` / `scrollable` off the SVG element as **closures over the
  widget objects it built**, and sizes the viewBox for that row count — so swapping the
  children left the pointer router aiming at _detached widgets laid out for a different
  height_. The ray genuinely hit the panel and produced a plausible uv; it just mapped to
  the wrong control. Scrolling died because `scrollBy` drove nodes no longer in the tree.
  It ran on a 500ms timer, and only fired when a debug source was registered — which is
  exactly why the terrain demo broke, the combat demo didn't, and a fresh entry looked
  fine until the first tick.
  **Lessons:** (1) if a component hands you an element with behaviour attached, that
  element is not a container you may reach into — rebuild it or leave it alone;
  (2) structural changes rebuild, live values update `<text>` in place (no structure, no
  closures touched); (3) the XR-only refresh mechanism existed _because_ of UI drift, so
  the drift caused the bug — see the new Principle above.
- **The headset's own recentre did nothing, because we were undoing it.** Holding the Meta
  button fires `reset` on the XR reference space: the runtime moves the world under you and
  expects the app to take the new pose as forward. We had baked `cockpitYawOffset` once, on
  entry, and kept applying it — correcting away the recentre against a reference space that
  no longer existed. Now we listen for `reset` (+ `onXRReferenceSpaceChanged`) and re-derive.
  Also: the entry capture happened **on the frame you took the seat**, when the viewer pose
  can still be null and the camera reports a stale rotation — hence "sometimes misaligned on
  entry, and exiting/re-entering while holding still fixes it" (that just bought a clean
  capture). Capture now waits for a real `getViewerPose()`.
  **The through-line for both bugs:** a value was baked once and then asserted against a
  world that had moved on. Presents as "sometimes fine, sometimes wildly off" — the
  signature of stale state, not of wrong maths.
- **Write-in debug panel (`addDebugSource`).** Any code can contribute lines + buttons to
  the Perf Stats panel, which is the only readout that exists in a headset (there's no
  console in VR, and VR is where the frame budget is tightest). Terrain reports its tile
  profile there and can be switched on from inside the headset. Lines update in place, so
  they're live — the first version snapshotted them and you sat watching frozen zeros.

_2026-07-11_

- **Standard controller for demos → `b3dController` + scene input focus.** Combat demos
  now drive through the unified controller (keyboard/glass-gamepad/hardware/XR) instead
  of bespoke per-demo pointer/key handlers. Two lessons folded into Principles: (1)
  **control assignments follow GTA V** with a VR-reachable fallback (essentials on XR
  buttons, overflow to the spatial menu); (2) **never name a callback prop `onFoo`** —
  the element creator binds `on*` props as DOM event listeners, so `onInput` silently
  became an `input`-event handler and never fired (renamed → `drive`; `onDeath` →
  `whenDestroyed` for the same reason). Cost a long blind-debugging detour; verified the
  fix live via Haltija. Glass gamepad's `controls` spec used to show only needed pieces.

_2026-07-02_

- **Panel placement + reticle behavior queued** (TODO.md → _XR spatial panels_).
  Headset finding: body-anchored panels clip into scenery (quick-access panel
  often below ground). Direction: closer + smaller panels to reduce clipping;
  strict-overlay mode only when needed (higher `renderingGroupId` + depth clear ≈
  cheap, NOT a full render pass; `XRQuadLayer` is the true-overlay endgame). The
  reticle is the exception — raycast, sit just short of the hit (or max range),
  scale down non-linearly (~½ at max range) so it stays legible. DECIDED: reticle
  billboards toward the eye by default, with align-to-surface-normal and
  distance-from-hit as configurable attributes.
- **Notification/toast system queued** (TODO.md → _Notification / toast system_).
  Panel-based transient message: appears slightly BELOW center view, dismissed by
  the user GAZING at it (reuse `gazeReveal`/facing math), then fades. Keep it a
  UX-layer concern (`notify(msg, opts)`), decoupled from narrative — the sim
  emits events, the driver/UX decides to surface them. DECIDED: dismiss by gaze
  DWELL (not instant glance), duration tunable by experiment. First test case: on
  first XR entry, notify "Look up to exit VR and access options" — exercises
  `notify()` and teaches the look-up gesture (pairs with an above-center
  exit/options panel).
- **Time-of-day slider in XR: reported broken, then confirmed working** in the
  headset. Did not reproduce; closed (see _Resolved_). Code trace confirmed the
  slider write + XR pick routing are sound. Left behind the "don't drive a
  slider-owned value from a timer too" note.
- **DOM Overlay ruled out; `XRQuadLayer` flagged to explore.** WebXR DOM Overlay
  is not worth pursuing (see _Dead ends_). `XRQuadLayer` (compositor layers) is
  the promising upgrade path for UI planes (see _Textures & redraws_).
- **rAF pump for VR bindings.** Found reactive→DOM bindings freeze in immersive
  sessions (window-rAF suspended); added `_installXrRafPump`. Documented in
  CLAUDE.md's WebXR section. → Principle: avoid window-rAF animation in XR.
- **`slider3d` value peek** replaces the LABEL, not the track (earlier attempt
  overwrote the track). In-panel mesh picker made VR-accessible; scene panel made
  rebuildable so async lists stay fresh.
- **XR scene panel pointer x was mirrored** — un-mirrored; sliders now reveal the
  exact value on interaction.
- Moved exploder/physics/sound/terrain demo controls **into the VR scene panel**
  (dual-presence) instead of HTML overlays.

_earlier (see `git log`)_

- **`xr-frames` foundation → body/neck/hand/entity frames.** Progression:
  reference-frame foundation → body-anchored panels (inventory/holster) → angular
  anchors + reveal modes + reticle → hand/wrist frames on the grips → EntityFrame
  (interlocutor) + NPC nameplates + `facingYaw`.
- **XR cockpit saga** (many fixes): panels drifted/billboarded when anchored to
  the rig origin → anchor to head's actual pose → fixed child of rig, no billboard
  → parent rig to hull directly → decompose hull world matrix (kill scaled-frame
  distortion) → recenter camera not panels. Lesson: parent to real transforms,
  decompose scaled matrices, don't hand-roll orientation.
- **`b3d-panel`** (`<tosi-b3d-panel>`): declarative spatial-UI panels as scene
  children so placement (frame/azimuth/elevation/preset) is tunable via attributes.
- **Glass gamepad evolution:** touch control surface → `b3dGamepad` Component →
  `b3d gamepad` attribute → `XrGamepadSource` (XR controllers → VirtualGamepad
  spine). Refactored onto tosijs `StyleSheet`; light-DOM + container-scaled.
- **`widgets3d`:** scroll-drag between controls (switch/slider hit-test); demo
  spin via `rotationQuaternion` (euler is ignored on b3d meshes).

---

## Open issues / to investigate

- **Stranded render queue on XR entry** (root-caused; fix pending headset verify).
  tosijs component render uses a **per-element `_renderQueued` flag**:
  `if(!this._renderQueued){this._renderQueued=true; requestAnimationFrame(render)}`.
  If a render is already queued when the immersive session **suspends
  `window.requestAnimationFrame`**, that callback is stranded → the flag stays
  `true` forever → the component never schedules another render → the rAF pump
  never sees it → its bindings freeze for the whole session. This bit the b3d
  time-of-day slider ("does nothing in XR until you exit"): the skybox's
  `realtimeScale` `setInterval` **perpetually re-queues** render(), so a render is
  always stranded when the session suspends rAF → `updateSky()` (gated behind
  render()) never runs in-session; the data (`demo.time`) is current, only the
  visual is frozen (it "takes effect" the instant you exit and the stranded render
  fires). Diagnostic tell: the sibling **toggle works in XR** — so bindings DO
  flush via the pump; the freeze was skybox-specific. **`await updates()` before
  entry can NOT fix a component with a continuous interval** (it re-queues
  immediately). **Real fix:** drive the visual off the **scene frame loop**, not
  tosijs render() — the skybox now calls `updateSky()` from its per-frame
  `onBeforeRenderObservable` observer (fires in flat AND XR), gated on a timeOfDay
  change. (`await updates()` before `enterXRAsync` kept as general hygiene.)
- **FOOTGUN (general): XR suspending `window.requestAnimationFrame` breaks ANY UI
  code that batches on it** — not just tosijs. Tweens, debounced/throttled layout,
  virtualized lists, IntersectionObserver-driven reveals, CSS-JS animation loops,
  "coalesce N changes into one rAF" patterns: all silently freeze the moment you
  enter an immersive session, and any "already scheduled" flag they hold gets
  stranded. Rules of thumb: (1) route per-frame work through
  `scene.onBeforeRenderObservable` / the XR frame loop, not `window.rAF`; (2) if a
  lib you don't control uses window-rAF, it must be pumped (like `_installXrRafPump`)
  AND flushed before entry; (3) prefer synchronous reactive value reads over
  rAF-deferred DOM projections for anything that must stay live in VR.

## Affordances vs. panel content

- **Always-available affordances go in a fixed toolbar, not as scrollable panel
  rows.** Enter VR started as a row inside the flat gear panel; in the library demo
  (a long scrolling list) it scrolled up and clipped, and it wasn't obvious VR was
  available. Fix: a fixed top-left **toolbar** grouping the gear + Enter VR side by
  side — visible, never clipped, obviously present. Lesson: a control the user must
  always be able to reach (enter VR, exit, home) belongs in chrome, not in
  scrollable content.
- **Emoji as button glyphs:** emoji render in SVG `<text>` and rasterize to texture
  in modern browsers — a fine quick-glyph alternative to icons (the ⚙ gear relies on
  it). Caveats: color-emoji rasterization varies by platform and they **can't be
  recolored/themed** (multicolor glyphs). For accent-following monochrome icons, use
  SVG paths.

## SVG UI text: measure to lay out (2026-07-15)

SVG `<text>` cannot wrap — and the usual escape, HTML in `<foreignObject>`, is **dead in
our pipeline specifically**: `SvgTexture` serialises the SVG to a Blob URL and draws it via
`<img>`, and browsers refuse to render `foreignObject` content from an image-loaded SVG (a
security wall — it would let you rasterise arbitrary DOM and read it back). It only renders
for SVG live in the document. So the answer everyone reaches for first is a trap here.

What actually works — and it's better than it sounds — is to **do our own wrapping**: split,
measure each candidate line with `canvas.measureText`, emit each line as its own `<text>`.
The non-obvious win is that `measureText`/`fillText` call the **same** shaper HTML text does,
so kerning/ligatures/proportional widths come out correct — we're not reimplementing text
_rendering_, only text _layout_. And for LTR UI chrome that layout collapses to "greedy
break on whitespace against measured widths," because the two brutal layers (shaping, bidi)
are respectively done-for-us and absent.

The boundary, on the record: whitespace breaks only — no CJK mid-run breaks, no hyphenation,
no bidi reordering. Fine for labels/HUD/debug; the moment localised text shows up, that's the
line that breaks first, and the escalation is Satori (flexbox→SVG, pairs with the resvg we
already depend on transitively) or HarfBuzz.

**Measure in LAYOUT space, not raster space.** Set `ctx.font` to the size in SVG user units
and compare to the SVG-space width — so the wrap is resolution-independent and bumping the
texture from 384→512 doesn't silently re-wrap every label. (Implemented: `widgets3d-layout`
`wrapByMeasure`/`textMeasurer`/`measureTextWrap`; `widgets3d` `textBlock3d` + `label3d`
`compact`. Debug panel converted — compact block per source instead of a 40px row per line,
which both wasted vertical space and clipped.)

## Next: graphical widgets + floating layers (Tonio, 2026-07-15)

Two directions the measured-layout work unblocks, filed for when we pick them up:

- **Icon widgets** — a button should be able to carry an SVG glyph (or emoji, with the
  recolour caveat above) instead of a text label, and size to it. Now that widgets measure
  content, a button can shrink-wrap its icon/label instead of assuming a full row. This is the
  path to a compact, non-text-hungry control strip.
- **Popups / sub-windows / floats** — so a `select3d` can be a small closed control that opens
  a menu, a menu can be an actual overlay rather than an inline expanded list, tooltips exist,
  etc. Needs a floating layer above the panel's scroll region with its own hit-testing, and in
  VR that means a second quad/panel positioned in front (coordinate-picked like the scene
  panel), not a DOM popover. This is the bigger piece; the text measurement is a prerequisite
  (a menu has to size to its widest item).

## Resolved

- **Time-of-day slider in XR — works** (b3d demo; confirmed in the headset
  2026-07-02). Earlier report of it "not working in XR" did not reproduce.
  Code trace confirmed the write path (`slider3d` → `boundValue.set` →
  `demo.time.value`) and the XR pick routing (`tosi-b3d.ts:1370-1409`,
  un-mirrored x, widget-local `setFromX`) are both sound. Residual (non-bug)
  smell worth remembering: the demo has **three writers to time** — the slider,
  the skybox `realtimeScale: 100` auto-advance (`b3d-skybox.ts:197`), and a 1 s
  sky→`demo.time` feedback `setInterval` (`tosi-b3d.ts:87`) — so the slider
  nudges time rather than owning it. If a control needs to truly own a value,
  don't also drive that value from a timer.

## Known gotchas to remember

- b3d meshes set `rotationQuaternion`, so `mesh.rotation` (euler) is ignored —
  animate the quaternion (or `rx/ry/rz`). Bit the widgets3d demo.
- tjs-lang transpiler: don't alias `BABYLON` to an ALL-CAPS name and reassign it
  in a callback (`B = BABYLON`) — it's rewritten to `const` and shadows a
  module-level `let`. Use a lowercase alias or pass as a parameter.

## Follow-camera jitter — the rules we paid for (aircraft chase)

~6 commits fought chase-camera jitter before it settled. The root causes, so the next
follow/vehicle camera doesn't re-derive them:

1. **Sample the followed entity AFTER it integrates, not before.** Reading the aircraft's
   position at the top of the frame (pre-move) and placing the rig from it lags one frame and
   jitters under acceleration/throttle. Update the chase pivot at the END of the movement step,
   after position + ground clamp, with `node.computeWorldMatrix(true)`.
2. **Parent the rig to a level position+heading pivot — not the airframe.** A camera parented to
   a rolling/pitching mesh inherits its shake. Use a `TransformNode` that carries only position
   and yaw; the camera rides that.
3. **A parented `FreeCamera` ignores parent-roll AND `upVector` for the view.** To bank the view,
   put the roll in the camera's OWN `rotationQuaternion` (`RotationYawPitchRoll(0, lookPitch,
-bank * follow)`), not on the parent and not via upVector.
4. **Don't per-frame low-pass a value you can derive deterministically.** Damping the bank added
   dt-dependent jitter; taking `fbw.bank` directly (the model already eased it) is smooth. Low-pass
   only genuinely noisy sensed inputs, never a clean computed one.

Companion to the `setGameplayCamera` note above — this is the _content_ of a good gameplay camera;
that's the XR-safe _mechanism_ for switching to one.

## SVG UI surface — four input modalities collapse to two event paths (planned)

The first-class SVG UI surface (the flow `box` + overlay/popup, on `flow-layout.ts`) must serve
four input modalities without four code paths — they collapse to **two**:

- **Pointer** — mouse, touch, and VR (controller ray → texture UV → box coords) all feed one
  `handlePointer(kind, x, y)`: hit-test the laid-out children, dispatch, support capture (a pressed
  key / open popup owns the pointer). This is the routing the panels already use.
- **Focus-traversal** — a **gamepad user has no pointer**, so the surface needs directional focus
  navigation: D-pad / stick moves a focus highlight between focusable children, A activates, B backs
  out. Keyboard Tab/arrows ride the same path.

Key insight: **the layout gives directional nav for free.** `flowLayout` returns a box per child, so
"the nearest focusable to the right/down of the focused one" is a spatial nearest-neighbour query
over those boxes — no hand-authored tab order. Focus is also what carries **cross-surface** input (a
floating keyboard targeting a field on another surface) and the **cascade popup**'s active branch.

So `box`'s event model is designed around BOTH from the start — a pointer path and a focus/traversal
path sharing one "which child → activate" dispatch. Pointer lands first; focus-nav is the next slice.

## Show selection with an icon, not with intensity

Selection state (a chosen row, a ticked option) is drawn as an **explicit mark** — `circle` /
`checkCircle` for single-select, `square` / `checkSquare` for multi — never as "the selected one is
brighter".

The reason is channel contention. Hover, focus, pressed, and disabled **all** naturally want the
same encoding: intensity (contrast, opacity, brightness). Adding selection to that pile means
tuning five states against each other on one axis, and the result is always fragile — subtly
different greys that read as "slightly off" rather than as distinct states, and that stop being
distinguishable the moment anything changes (a theme, a background, a viewing angle).

An icon is a **different channel**, so it is orthogonal: a row can be hovered AND selected AND
focused at once and all three still read. Nothing has to be finessed against anything else. That
also means hover/focus keep the full intensity range to themselves rather than each getting a
sliver of it.

This matters more here than in a flat DOM UI, because our surfaces are also **rasterized onto a 3D
texture and viewed in a headset**: at texture resolution, off-axis, through headset optics, small
intensity differences are the first thing to disappear. A glyph survives all of that — it has
_shape_, not just value.

Corollary: **focus and selection are different states and both must show.** With a D-pad you need
to see where you are before you commit to toggling it, so the focus ring stays in addition to the
selection icon. They don't collide, precisely because they're on different channels.

— agreed with Tonio while designing table/list selection; the icons already existed (`checkCircle`,
`square`, `checkSquare`), only `circle` had to be added.

## A popup must stay inside its widget's rect (host routes by child rect)

The keyboard's accent strip opened _above_ the held key — which for the top row (qwertyuiop:
every vowel) placed it outside the keyboard's own rect, drawn over the text field sitting above
it in the panel. Rendering is unclipped so this LOOKED fine; but the host `box` routes pointers
by child rect, so the tap on `ö` was delivered to the field, which ate it. Classic silent
divergence between where something _paints_ and who _owns_ the pixels it painted on.

Fix: the strip stays inside the keyboard — clamped to the top edge, and when clamping would sit
it on the pressed key itself (top row) it opens **below** the key instead. The general rule: an
overlay a widget draws for itself must stay inside that widget's bounds, because the routing
layer doesn't know it exists. (An overlay that genuinely must escape the widget belongs to the
_surface_'s overlay layer, which owns routing for it — that's what menus/panels do.)

Related fix, same session: a sticky accent strip's origin key now types the plain letter (tap
`o` again → `o`), instead of the tap being spent purely on dismissal — "nothing happens" on a
real device read as breakage, not as a spent tap.

## Inner focus: one child, many stops (the escape contract, generalized)

The keyboard is ONE box child but ~35 focus stops, and box-level focus drew one ring around the
whole keyboard — which is noise, not focus. `table` had already solved this shape standalone
(focusMove returns false at the ends so the host can move on); that contract is now a first-class
`BoxChild`/`Widget3d` protocol: `focusMove(dx, dy) → boolean` (false = focus escaped, host moves
on), `focusActivate`, `focusClear`. The box delegates D-pad moves into a focused child that
implements it, hides its own ring (the child draws a per-item one), calls `focusMove` once on
ENTRY with the direction of travel (arriving downward lands on the top row, not wherever focus
last was), and `focusClear` when focus actually leaves.

We first shipped a divergence from table here — a tap only RELOCATED an already-active focus,
never summoning the ring, on the theory that typing is a stream of taps and a chasing ring is
noise. **Device testing reversed it**: the missing ring read as "focus is broken", and it
orphaned the click-then-Space flow (click a key, press Space to press it — the action-button
convention). Focus now follows the press everywhere, as the table does. Lesson: an invisible
state that the user is expected to act on isn't quiet, it's broken — quietness only works for
states nothing acts on.

Related, same session: the field's caret is its focus indicator, so it must be **dim when
unfocused, never hidden** — a vanished caret reads as "focus is lost and unrecoverable" rather
than "focus is elsewhere" (with two fields on a panel, dim-vs-bright is also what tells you
which one is live). And the host box reflects focus INTO widgets via `setState` — the widget's
own taps can only ever turn its focus ON; only the host knows when focus comes back.

— from Tonio's on-device keyboard test (drag-selects-text, eaten accent tap, whole-keyboard ring)

## A scene-picked surface needs capture semantics — and the camera must yield

Routing scene picks (texture UV → `surface.handlePointer`) is not enough to host UI on a
plane. Two things the flat overlay gets for free must be reproduced by hand:

1. **The camera yields during a UI press.** With an orbit camera attached, a press on the
   panel starts BOTH a UI gesture and an orbit — the view rotates out from under the pointer,
   the up's pick misses the plane, and the surface never hears the release. Detach the camera
   control on a panel-press, reattach on release. (Symptom on device: "click a key and it
   just orbits, key stays stuck".)
2. **An up that lands off the plane still ends the gesture.** The flat overlay gets this from
   `setPointerCapture`; the scene path must send `leave`/`up` itself or the pressed child is
   captured forever. Same family as `BoxChild.handlePointer` capture and the accent strip's
   stay-in-rect rule: every pointer contract the DOM gives you for free has to be restated
   once input arrives via picking.

If a third demo needs this, it's time to fold the whole block (pick routing + camera yield +
capture) into `b3dSvgPlane`/a `surfacePlane` helper instead of copying it. **(Done,
2026-08-03: `panelScene` in b3d-svg-plane — the fourth copy triggered it. Six demos now use
it; a demo goes dual-presentation in two lines.)**

— from Tonio's on-device VR keyboard test

## Coda: the lost-pointerup saga — root cause found

The chain, in full, because each link is a lesson:

1. The VR keyboard demo wrote `pointerEvents: false` — but the attribute is `'on' | 'off'`
   (per the no-default-true-boolean rule), and **tosijs silently discards a wrong-typed
   write** (filed as tosijs#24). Pick→DOM event forwarding stayed ON while everyone
   believed it off.
2. The forwarded events carried **the physical mouse's `pointerId`**, and bubbled into the
   flat demo's listeners — whose standard `svgEl.setPointerCapture(e.pointerId)` then
   captured the REAL mouse to the flat SVG mirror. From that moment the browser rerouted
   every real move/up away from the canvas: Babylon saw downs and no ups.
3. Downstream, one lost up wedged every routing layer (stuck tints, phantom captures, an
   orphaned space-press eating the next click) — now moot, but the self-healing it forced
   (down-flushes-stale-gesture at keyboard/box/surface) stays: it converts ANY future lost
   up into a free recovery.

Durable rules extracted: **synthetic events must never carry a real pointer's id** (a
capture on them can hijack the physical stream — b3dSvgPlane now uses a reserved id);
**"off" must be verified, not assumed** (read the prop back when a flag guards routing);
and debugging order — when clicks vanish, tape the DOM layer FIRST (window-capture
listeners showed the up's true target in one probe, after days of plausible theories
above it).

— diagnosed with Tonio's console tape + live-page event taps, 2026-08-03

## One gesture contract, owned by the library — and screen coordinates don't exist in VR

Tonio's review of the dual-presentation demos caught bespoke drift red-handed: the flow box
didn't orbit but its buttons worked in VR; the resizable box orbited but its grip was dead in
VR. Two causes, both now owned by `panelScene` instead of per-demo code:

1. **Screen coordinates don't exist in a headset.** The resizable demo's catcher picked via
   `scene.pointerX/pointerY` — a screen concept. Flat, that's the mouse; in an immersive
   session there is no meaningful screen point, so the catcher never hit and resize was dead.
   The rule: gesture collection goes through the event's **pick ray** (`pickInfo.ray`), which
   is the mouse ray flat and the controller ray in XR — one code path, both worlds.
2. **Orbit-vs-UI is a POLICY and must be explicit.** Two demos shipped two accidental
   policies (any-press-claims vs grip-only-claims). `panelScene` now takes a `claim(x, y)`
   predicate — default: every panel press is UI (drag the background to orbit); a resize grip
   passes its hit-test so inert panel body still orbits. Different behaviour is now a stated
   choice, not an accident of which demo you copied from.

The catcher quad generalized into `panelScene` too: every claimed gesture samples a frozen
gesture-start frame (the plane's world matrix at the down), so a target that moves or rescales
its own plane mid-gesture — resize! — stays stable, and the whole thing works flat and in VR
identically. Also fixed alongside: `b3dSvgPlane` now routes the texture's alpha to the mesh
(`opacityTexture`), so a panel's rounded corners sit on transparency instead of writing checks
an opaque black substrate couldn't cash.

— Tonio's cross-demo VR review, 2026-08-03; the factoring critique ("good behaviour lessons
from one demo don't make it across demos") is the durable point: interaction contracts belong
in the library, demos only choose policies.

## The SVG UI family is namespaced: `ui.box`, `ui.table`, `ui.keyboard`

The surface's exports are common nouns (`box`, `table`, `button`, `edit`, `insert`…), and a
library barrel exporting bare common nouns collides with every consumer's own vocabulary.
Tonio's call at the 0.6.0 rc gate: put the family in ONE container named `ui` — the noun
stays simple (`ui.table` reads as well as `table`), the top level stays clean, and the
whole surface has one discoverable home. Types stay top-level (PascalCase doesn't pollute,
and types can't live on a const). The rc window made the rename free; after final it would
have been a breaking change. Demos import `ui` and destructure, so their bodies read
unchanged.

## Popups should be NEW SURFACES, not crammed into one

**Decided 2026-08-18 (Tonio).** A popup — a menu cascade, a dropdown's open
list, a debug panel — should spawn an **additional surface**, a second plane
floating above the first, rather than being laid out inside the opener's SVG.

> "In 3D (and especially VR) we actually control the universe in a way we don't
> in the browser. We should leverage that, rather than trying to make it all
> work in a second-rate single 2d panel."

### What this retires

`TODO.md`'s `select3d` entry said a dropdown "**MUST** grow the panel's layout
(stackLayout re-flows) rather than a DOM-style absolute popover — a popover
won't rasterize into the VR texture."

That constraint is **real but escapable**, and noticing which is the whole
point. It is true that an absolutely-positioned popover cannot be drawn outside
the SVG that becomes the texture. It is _not_ true that a popup must therefore
live inside that SVG. The third option — **another texture, on another plane** —
was invisible because we were reasoning inside a browser's frame, where there is
exactly one window and overlapping UI is a z-index problem.

In a scene there is no such scarcity. Planes are cheap, they can sit in front of
each other with real depth, and they can be _somewhere else_ entirely.

### Why it is better, not merely different

- **The opener does not reflow.** Today, opening the debug tool shoves the
  author's controls down the panel — the content you were reading moves because
  you asked a question about something else. A second surface leaves the first
  alone.
- **Tear-offs become natural.** If a popup is already its own surface, "keep
  this open and put it over there" is a re-parent, not a feature. The debug
  readout you want to watch _while_ flying belongs beside you, not stacked in a
  menu you have to hold open.
- **Depth is a free channel.** A popup slightly nearer the viewer reads as "on
  top" without a z-index, a shadow, or a scrim — the thing 2D UI spends real
  effort faking.
- **It matches how the hardware wants to be used.** A headset's advantage over a
  monitor is that UI can occupy space. A single panel with everything crammed in
  is a monitor emulator.

### The model

- A **surface** is a plane + an `SvgTexture` + a pointer router. We already have
  all three (`svg-texture`, `frame-panel`, `panelScene`).
- A **popup** is a child surface, placed relative to its opener and owned by it:
  closing the opener closes it, and it inherits the opener's frame so it travels
  with it.
- A **tear-off** is a popup PROMOTED to a frame of its own (`rig` or `world`),
  at which point it stops being owned and stays where you put it. That is a
  re-parent plus a lifetime change — see `SPATIAL-DESIGN.md`, which already has
  the transform math for exactly this move.

### Open questions (do not guess these — try them in a headset)

1. **Placement.** Offset in the opener's plane, or arc'd toward the viewer? A
   popup that appears co-planar may be hard to distinguish from its opener.
2. **Reach.** In VR the popup must land where your hand already is, not where
   the geometry says. This is probably the hardest part and the one most likely
   to need a controller in hand to settle.
3. **Budget.** Each surface is a texture. `perf-probe` should cap concurrent
   surfaces per tier, and the ambient allocator's rule applies: something that
   cannot have its honest minimum switches OFF rather than degrading.
4. **Pointer routing across surfaces.** One ray, several planes — the nearest
   hit wins, but capture (`widget-box`'s drag-survives-leaving-the-track
   contract) has to survive a ray crossing between surfaces mid-drag.
5. **Flat parity.** Flat, this could be one overlay with several absolutely
   positioned panels — which is what `surface.ts` already does. The two
   presentations may legitimately differ here, and if so, say so out loud
   (see "One UI, two presentations": divergence is a bug _until proven
   otherwise_, and this may be the proof).

### Building it: three things the first cut got wrong (2026-08-18)

1. **The element owns the transform.** Writing `mesh.position` did nothing —
   `AbstractMesh.render()` rewrites it from the element's `x/y/z` every frame, so
   the popups sat at the origin looking unplaced. Same family as `ry` being
   degrees: when an element manages a node, the element's fields are the source
   of truth and the node's are output. A drag behaviour hits this too, which is
   why the drag syncs back into `x/y/z` instead of being left to move the mesh.

2. **`b3d-svg-plane` was clearing a parent it never set.** Its `cameraRelative`
   sync ran `mesh.parent = null` unconditionally whenever the flag was off,
   which silently tore off any parent a caller had set, one frame later, with no
   error. Fixed by recording whether WE parented it — the identical shape as the
   pause bug that re-attached cameras it had never detached. **The rule: a guard
   must record what you did, not observe what state the object is in.**

3. **A free drag comes apart the moment you orbit.** Tonio: "if you rotate the
   camera and drag a surface, horrible things happen." Constrained to the
   panel's own normal (`dragPlaneNormal` + `useObjectOrientationForDragging`), so
   the gesture means the same thing from every angle: you slide it around its
   face, which is what a flat panel affords.

Bring-to-front is a real depth change, applied **toward the camera** rather than
along world −Z — "in front" is a viewer-relative claim, and a stack arranged on
a world axis is only correct from one side of the room.

## An in-headset readout beats three good hypotheses (0.7.0, VR pass 2)

The phantom-collision hunt cost three wrong theories — floating-origin desync, a
CoG pivot, an incomplete own-mesh exclusion — each plausible, each refuted by
measurement, none of them the bug. What ended it in one round was a **two-line
readout in the Perf panel** that printed the name of the mesh the ray had called
ground: `hit=frame-panel`. The UI. Sitting in front of the cockpit, being swept
as terrain.

The same thing happened twice more in one sitting:

- "The left stick is broken" → the readout showed `L:0.00,0.00`, **not** `L:—`.
  Controller present, stick present. The rig coordinates were in the hundreds
  and free-fly walks at 2.5 m/s, so movement was ~0.5% of the scene per second.
  Turning is angular and therefore scale-free — which is exactly why one stick
  felt fine and the other felt dead.
- "The panel is behind me" → `seed done` killed the sign-error theory and left
  the real one: the eye frame takes its yaw from `eyeYawOffset`, not the head.

**The rule this earns:** in XR there is no console, `window.rAF` is suspended,
and the tester is a human describing a world you cannot see. Under those
conditions a hypothesis is expensive and a printed fact is cheap. Build the
readout FIRST — before the second hypothesis, not after the third — and make it
name things (a mesh name, a stick's axes, a captured yaw) rather than report
health. `b3d.addDebugSource` exists for this and costs a few lines.

**Corollary, learned the same day:** an instrument that can lie is worse than
none. The first version of the crash reporter covered only the ground-contact
path, while the actual killer was the impact sweep — which called `crash()` with
no report at all, so the panel would have said "no crash yet" for the very bug
it was built to catch. Check that every path which can produce the symptom
writes the record.

## The window frame in 2D, depth and collision in XR: don't cheat the medium

Tonio, during the 0.7.0 tag run:

> There is a family of usability issues in web UX that basically come down to
> DOM elements are clipped to a window whereas a real UI can layer above and
> outside a window. In XR UX the equivalent issue is that depth and collision
> are best treated as "reality" in the same way the window frame needs to be
> treated as "reality" in the 2D web.

**The 2D pathology.** A DOM element lives inside its container's clip and
stacking context, so `z-index` is a LOCAL claim: it cannot lift you out of an
`overflow: hidden` ancestor, and it means nothing across stacking contexts. The
only real fix is to leave — render at the document root. Native UI does not have
the problem at all, because menus and tooltips can extend past the window.

**The XR analogue is exact.** Depth and collision are the reality you do not get
to opt out of. `renderingGroupId` is `z-index`: a COMPOSITING claim. Reached for
it for the same reason people reach for `z-index: 9999`, and it failed the same
way — a respawn dialog buried in terrain was set to render in group 1, painted
in front, and became **untouchable**, because picking is geometric and does not
care what you drew last. Visible-but-dead is worse than honestly buried: it
invites a press that cannot land.

**The rule: place it somewhere real, don't composite it on top.**

- 2D: escape the container. Render at the root, then position deliberately
  (which is what `placePopup`'s flip/clamp is for).
- XR: put the thing at a real location with clear line of sight, and let depth
  do what depth does. The design that follows is world-placed dialogs with
  **gaze recovery** — if you look away for ~2s it re-picks a spot and comes to
  you — which gets findability without the panel chasing your eyes.

**The corollary we already got right.** "Popups should be NEW SURFACES" was this
same insight a month earlier: _"in 3D (and especially VR) we actually control
the universe in a way we don't in the browser."_ A popup becomes another plane
at a real place, rather than something crammed into a parent's rect — the exact
equivalent of rendering at the document root instead of fighting the clip. The
lesson is that the 3D version of a 2D escape hatch is usually _more_ honest, not
less: you have somewhere real to put things.

**Smell test for the next one.** If a fix makes something LOOK right without
changing where it IS, ask what else keys off where it is — picking, collision,
occlusion, audio. In 2D that list is short. In XR it is most of the system.
