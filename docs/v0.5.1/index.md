# 0.5.1

<!--{ "parent": "CHANGELOG", "order": 9994999 }-->

## ⚠️ Breaking — renamed public methods (`on*` → `add*Listener` / `handle*`)

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

## Added

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

## Changed

- **Demo cameras** migrated to a shared `demo-utils` `orbitCam` helper (tilt-clamped so an orbit
  can't dip below the horizon) instead of 24 hand-rolled per-demo cameras. Authoring-only — no
  library-API impact.

## Fixed

- **Cloud whiteout** now behaves correctly: it ramps to full **earlier** (less "snaps on at the
  moment of entry", denser once inside), **blots out the sky** (not just scene geometry), and
  **mutes projected cloud shadows** under the whiteout (fogged fragments no longer darken through
  the fog).
- **`b3d-controller`** `player` now defaults to `false`. tosijs began **throwing** on an
  `initAttributes` boolean that defaults to `true` (an absent HTML boolean attribute is `false`,
  so a `true` default can never turn on) — the old `player: true` default made the controller
  throw at construction and silently never wire input.
