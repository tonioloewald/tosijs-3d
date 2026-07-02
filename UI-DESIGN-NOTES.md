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
