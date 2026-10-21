# 0.7.1

<!--{ "parent": "CHANGELOG", "order": 9992999 }-->

## Fixed

- **Modal dialogs are WORLD-PLACED and follow you if you look away.** The
  respawn and pause panels sit at a spot with clear line of sight, face you, and
  ease to a fresh spot after ~2s outside a generous cone. `placement="world"` on
  `<tosi-b3d-svg-plane>`; the rules are pure and tested in `dialog-placement`.

  This replaces three compensations that were each fixing a symptom: head-locking
  (jittered with a jostling death-cam), riding the body frame (put it at knee
  height), and rendering on top (painted in front but became **untouchable**,
  because picking is geometric). It also fixes the case none of them could —
  dying in cockpit view with the camera inside a hillside, where nothing "just
  in front of you" helps.

- **`turnRateDeg` returns exactly what you set.** Converting through radians is
  lossy — `30` derived back as `29.999999999999996`, which is what a slider
  readout or a saved scene would show. It now remembers the value you supplied
  together with the radians it produced, so a later write to `turnRate` is
  detected exactly and the view derives fresh. Still one stored value.

## Added

- **`flightStage()`** — a setting an aircraft can actually operate in: ground,
  sky and fog at flight scale, a library, a sun configured for the ground it
  lights, and **a death panel that respawns you**. Takes a plane FACTORY, not an
  instance, because respawn has to build a new one — passing an instance is what
  made a crash unrecoverable. Returns `{ elements, aircraft }` rather than an
  array, since the current aircraft changes on respawn and a captured reference
  goes stale. The clouds demo lost 22 lines converting to it.
- **`tosijs-3d/demo-utils`** — the scene-setup helpers every live example uses
  are now published, so **code copied off a doc page resolves in your project**.
  Previously 38 examples across 33 files imported a bare `demo-utils` that no
  consumer could resolve, and since the demo goes first on every page it was the
  first thing anyone copied.

  They ship with an explicit stability disclaimer: **dev helpers, not API.** They
  can change or vanish in a patch, they are tuned to flatter a doc page rather
  than your game, and production code should compose `b3dSun`/`b3dSkybox`/
  `b3dGround` directly.

  Vetted rather than published wholesale — the module was not shippable as-is:

  - `orbitCam` takes **`alphaDeg`/`betaDeg`**; the radian `alpha`/`beta` still
    work and are converted, so existing snippets keep running.
  - Options are typed — the two `Record<string, unknown>` signatures are gone.
  - Ground helpers take a **`texture` URL** instead of exporting root-absolute
    asset paths that resolve only on this site.
  - `demoSun` uses the **auto shadow-size sentinel** rather than hard-wiring
    2048 over the device-tier budget.
  - `volumetricDemo`, `impactMarker` and the asset constants stay **private** —
    they are page-specific, not API.
