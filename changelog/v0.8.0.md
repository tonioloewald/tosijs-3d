# 0.8.0

<!--{ "parent": "CHANGELOG", "order": 9992000 }-->

Lights, editors, and the schema surface `tosijs-3d-ensemble` asked for — plus
the two renames that were waiting for a minor.

## ⚠️ Breaking

- **Peer dependency: `tosijs` is now `^1.9.2`** (was `^1.7.8`). Upgrade tosijs
  alongside this. The floor moved because 1.9 fixes five issues we filed
  (tosijs#14/#15/#22/#24/#27) and holding it down only defers the work.

  Behaviour that changed with it, verified rather than assumed: a wrong-typed
  write to an `initAttributes` prop used to be **silently discarded** and now
  **warns and applies the value**. So `foo: false` on an `'on'|'off'` attribute
  genuinely sets `false` where it used to quietly default — use `isOff()`,
  which accepts `'off'`, `false` and `'false'`.

- **Callbacks are `handleX`, not `onX`.** `handleChange`, `handleClick`,
  `handleSelect`. **Both spellings work through 0.8.x** and the old one warns
  once per name; `onX` is removed in 0.9.

  Not a style preference: these are plain factories today, but the moment one
  becomes a tosijs component the element creator binds an `on*` prop as a DOM
  event **listener** and the class field is silently never called. `handleX`
  cannot be mistaken for an event name. Giving both, the new one wins.

  **Migrated in this release** — `inputField`, `keyboard`, `table`,
  `box`/`surface`, popups, debug actions and the curve/footprint/vector fields.
  In other words: all of them. `b3d-trigger` gains `whenEnter`/`whenExit`
  instead, because components use `when*` (see Fixed).

## Added

- **`handlerOf`** (`handler-of.ts`, exported from the barrel) — the shim behind
  the `handleX`/`onX` rule, in its own dependency-free module so the smallest
  widget can adopt it without importing `widgets3d`. Use it for your own
  widgets: `handlerOf(config, 'handleChange', 'onChange')?.(value)`.

- **Lamps** — `b3dPointLight`, `b3dSpotLight`, `b3dAreaLight`: a placed light
  with its own fixture geometry, which **tracks the light** (a fluorescent's
  bulb stutters as it strikes and dims to a red ember as it dies). Shadows where
  Babylon allows, **gels** where it allows (spot only), and a generated cone
  `shape` (`circle`/`square` + `shapeAspect`, `shapeSoftness`) plus a true
  `innerAngle` penumbra.

- **Light programs** — one curve per channel (brightness, hue, saturation,
  range) split into attack / sustain / decay by two markers. `duration` divides
  by those markers, so dragging one **retimes** the lamp. Presets: `steady`,
  `fluorescent`, `flickery`, `brownout`, `candle`, `fireplace`. `timeSource`
  picks the real clock (default — a flicker should not freeze when the world
  pauses) or the world's.

- **Editors** — `curveProgram3d` (several curves sharing one pair of draggable
  split markers), `lightEditor3d` (the whole lamp), and `curveMarkers`.
  Controlled, with `handleCommit(value, describe)` once per gesture carrying
  canonical values and a verb phrase, so a document records one undo step.

- **`scene-schemas`** — JSON Schema for all nine scene primitives: skybox, sun,
  water, ground, fog, clouds, ambient, terrain, reflections (and the hemispheric
  light). **No DOM, no Babylon.** So nobody hand-copies our
  attributes: a consumer's hand-written skybox schema carried 6 of 16 and
  disagreed on a default. Drift is caught by a test, not promised.

- **`province-climate`** — water, temperature and volcanism as bipolar bias
  curves (`0.5` leaves the base alone) plus water presence and level as scalars,
  because "there is a lake here at 12 m" is not something a curve can say.

- **`spinner3d` / `progress3d`** — the widget set could say what a value IS but
  not that work was under way. The spinner animates as GEOMETRY, not CSS,
  because a keyframe animation does not run once the SVG is rasterised to a
  texture — it would look right flat and freeze in a headset.

- **Filtered tables** — `filter` / `setFilter(predicate)` and `counts`. A filter
  never drops a selection: hiding is a view state, and losing a selection to it
  would make typing in a search box destructive.

- **`table` button columns** — `kind: 'button'` with `menu(row)` opens an action
  menu anchored to the cell. The button takes the press instead of the row, so
  a row's ⋯ does not also select it.

- **`registerIcons`** — consumers add icons every widget resolves by name.
- **Log sliders** — `scale: 'log' | 'log2'`, `snap`, and `zeroStop` for a
  quantity that spans decades and can still be switched off.
- **Action menus** — `openMenu3d`, `button3d({ menu })`, `iconGrid3d` menu
  cells; `disabled` takes a predicate so a menu can be a constant.
- **`table`** — `ColumnSpec.kind: 'icon'`.

## Fixed

- A **move** no longer costs a scene, and a genuine removal now disposes the
  engine — a leaked WebGL context is not just memory (Chrome caps them near 16
  and force-loses the oldest).
- `shadows`, the gel and `geometry` each accepted a write and did nothing; all
  three now sync per render. Lamps also never marked shadow **receivers**, so a
  shadow map was rendered that nothing read.
- `canonicalProgram` silently dropped `duration`, so a committed edit turned a
  flickering lamp steady.
- A nested widget's popup opened at the top of its container rather than beside
  the control.
- `lightEditor3d` shipped demo copy into every consumer's panel; the hint is now
  opt-in.
- The aircraft chase camera sat too close after content moved to human scale.
- **`themeEditor` never called back.** It read `config.onChange` while its
  callers passed `handleChange`, so the theme table updated and the host's
  rebuild never ran — the controls moved and the panels they edit did not.
  `handleChange` is now the option; `onChange` still works, deprecated.
- A metric typed **out of range** left the slider on the cap and the number
  field above it, with the theme taking the out-of-range value — the exact
  drift a paired slider-and-field exists to prevent. Values are clamped now.
- Two demos (`w3d-theme`, `keyboard`) passed `handleChange` to `inputField`,
  which reads `onChange` — so typing updated nothing. Demo code lives in doc
  comments and is **not type-checked**, which is why this class of mistake
  reaches a page instead of the compiler.
- **The `curve-program` demo was truncated on the published site.** Its doc
  comment contained a nested `/* … */`, and block comments do not nest — the
  inner `*/` closed the page early, so roughly half the demo silently vanished.
- **The in-scene panel was sized by a guess, and the guess was wrong for the
  one panel that mattered.** Height was `46 + rows × 48`, which assumes a row is
  about 48px. `lightEditor3d` is ONE row that lays out over 1200px, so its panel
  was built ~142px tall and you scrolled a postage stamp. It now sizes to its
  content (`height: 'fit'`) with a cap, so the same panel is 620px — Tonio, from
  the headset: _"crammed into a tiny tiny view so you have to scroll it
  constantly… I didn't try messing with curves because they were too far down."_
- **The in-scene panel's icon bar no longer scrolls away.** It carries Exit VR,
  and a control you need in order to LEAVE is the one thing a headset panel
  cannot afford to lose. `panel3d` gained a `header` option — rows pinned above
  the scrolling body — which also ends a divergence, since the flat
  presentation has always pinned its bar by rendering it as DOM.
- **The theme editor no longer follows you to other demos.** It edits the global
  table deliberately (that is what makes both panels re-theme live), but the doc
  site is one page, so walking away left everything else wearing your palette.
  The demo now restores it on unmount.
- **`dist` could not be imported by Node at all** — 394 relative specifiers were
  written without an extension (`from './tosi-b3d'`), which every bundler and
  Bun resolves and Node's ESM resolver does not. Reported by
  `tosijs-3d-ensemble` (#69) after they fixed the identical fault in their own
  package and the failure moved one level down into ours.

  Source specifiers now carry `.js` — the TypeScript convention, passed through
  by `tsc` and resolved fine by bundlers, so it works everywhere and keeps the
  per-file `dist` we ship deliberately. That covers deep package subpaths too
  (`@babylonjs/core/Misc/observable.js`), which failed the same way. Verified by
  importing the built package under Node 24, not by reasoning about it.

  A test now asserts it **of the source**, so it fails at authoring time rather
  than after a publish — the only moment anyone was going to notice, since every
  loop here is a bundler or Bun.

- **Subpath exports** — `import { validateLight } from 'tosijs-3d/light-settings'`
  now works. The pure modules were split from their editors precisely so a
  consumer could validate documents headlessly, but the only export was the
  barrel, which defines custom elements on import and needs `HTMLElement`. So
  the headless half was still behind a browser. It is not now.

  ⚠️ **This is a wildcard** (`"./*"` → `./dist/*.js`), so **every module in
  `dist/` is now a supported specifier** and covered by semver — renaming one is
  a breaking change from here on. 142 of them were already public through the
  barrel; the genuinely new surface is nine. The three superseded modules
  (`reflections`, `dynamic-shadows`, `rippling-water`) are explicitly blocked so
  the wildcard cannot resurrect them.

- **`handleX` now works on every callback option, and `onX` is deprecated.**
  It used to depend on which widget you were holding — `curve3d` took
  `handleChange`, `inputField` took `onChange`, and neither complained about the
  other — which is what made three of the bugs above possible. Migrated:
  `table` (`handleSelect`/`handleActivate`), `box`'s `BoxChild` and `button`
  (`handleActivate`), `surface`'s `MenuItem` (`handleSelect`), `inputField`
  (`handleChange`/`handleEnter`/`handleFocus`, on the object as well as in
  config), `keyboard` (`handleKey`/`handleAction`/`handleCaretMove`), popups
  (`handleClose`), and debug-source actions (`handleClick`). Every `onX` still
  works, warns **once per name**, and is removed in 0.9.
- `b3d-trigger` gains **`whenEnter`/`whenExit`** (components use `when*`, like
  `whenImpact`). Passing `onEnter` to the element creator never set the field at
  all — it added a listener for the `'enter'` CustomEvent, so the callback got
  an Event while `trigger.onEnter = fn` got the trigger. Same callback, two
  different arguments depending on how you attached it.
- The `curve-program` and `curve-field` editors did not exist inside a headset:
  both put their controls in flat DOM beside the canvas, which an immersive
  session does not render. Both now also build through `scenePanel`.

## Changed

- Doc pages are named for what they are (`Light program editor`, `Curve
editor`, `Lamps`) rather than for their module. URLs are unchanged.
- ⚠️ `shadows="on"` is not free — one extra render of the caster list per lamp
  per frame, worse with a large `range`. Prefer `off` for dynamically inserted
  content.
