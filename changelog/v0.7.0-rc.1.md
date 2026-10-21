# 0.7.0-rc.1

<!--{ "parent": "CHANGELOG", "order": 9993001 }-->

Published to npm under the `next` tag on 2026-08-13, superseded by 0.7.0.
Everything in 0.7.0 above applies, with two differences that matter if you
installed it:

- It exported the 13 `carve` functions as **bare top-level names**; 0.7.0 moves
  them to `carve.*` (see ⚠️ Breaking).
- It did **not** export `sceneDelta`, despite the notes promising it — the
  `getDeltaTime`-in-a-scene-observer fix was unusable from the package.

It was tagged **before** the pre-release review ran, deliberately, to get it
into an adopter's hands sooner. The review found no blocker in the shipped
behaviour; what it found were the two release-artifact gaps above.
