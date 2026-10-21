# 0.7.6

<!--{ "parent": "CHANGELOG", "order": 9992994 }-->

An adoption-feedback release: everything here came from `tosijs-3d-ensemble`
hitting it for real.

## Fixed

- **The icon LANGUAGE now works on the texture path** (#54). `icon-data` stores
  every value with a trailing space, and a redirect is re-parsed as a _name_
  where that space is fatal — so `parseStyleSuffixes('cornerUpRight0f ')`
  returned `null` while the trimmed form resolves. Every **mirrored** icon failed
  to resolve, which is the whole left-facing set (they are all stored as
  `<rightVariant>0f`), on both the DOM and texture paths.

  `iconGlyph` also computed the composed style and then discarded it with a
  warning; it now applies it as an SVG transform. So a plain NAME carries the
  whole language everywhere — `cornerUpLeft`, `chevron270r` — and the
  `KeyDef.iconRotate`/`iconFlipX` workaround is deleted rather than copied into
  `IconGridItem`.

- **`iconExists(name)`** is exported, because the alternative is guessing:
  `name in iconData` says no to every composed name, and inspecting the stored
  value says no to every mirror.

- **`b3d-shadows` no longer writes `receiveShadows` on instanced meshes** (#53) —
  Babylon warns once per instance and ensemble measured ~10,000 messages on one
  load. The write was already a no-op (an instance takes the flag from its
  source), so nothing that received shadows before stops now.

- **You can swim up again.** Head depth was derived twice and the two disagreed:
  the up-thrust gate included `bodyBottom`, the up-AIM clamp did not. A swim pose
  puts the root at the waterline with the body below it, so the aim clamp thought
  the head was a body-length shallower than it was and clamped upward aim to
  nothing — you could push up but not aim up.

- **The keyboard works with ONE presentation.** `useDomLayer` was opt-in, so a
  flat-only consumer got no keyboard at all on a `height: 'fit'` panel and a
  cropped one on a tall panel. The DOM layer now installs itself when the panel
  is on the page.

- **The sky advances by measured time**, not by the interval it asked for — a
  backgrounded tab throttles timers, so the day cycle ran ~10x slow and never
  caught up.

## Changed

- **Underwater fog eases toward the surface** rather than being full-strength
  until the crossing band.
- **Console hygiene**: icon warnings fire once per problem rather than once per
  draw (they run from drawing code), demos report on the page instead of logging,
  and our own deprecated tosijs usages are gone — `elementCreator({tag})` →
  `static preferredTagName`, `static styleSpec` → `shadowStyleSpec`.
- **`b3d-physics` imports `PhysicsViewer` from the barrel** rather than mixing a
  deep path with it in the same module — the classic route to two Babylon module
  instances in a consumer's bundle.
