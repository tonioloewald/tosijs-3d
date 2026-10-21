# 0.8.10

<!--{ "parent": "CHANGELOG", "order": 9991990 }-->

**Two fixes from manta's orbit stage, and the doc site has shadows again
without a workaround.** Glow no longer whites out the frame under a fading
full-screen mesh, and the skybox leaves the background colour alone for a
camera that cannot see it. tosijs-ui 1.16 loads the doc site once, which was
the cause of ensemble's `Cannot redefine property` error and our missing doc-
site shadows.

Size: barrel (min, packages external) 898.6 KB raw / 300.6 KB gz, +0.05% on
0.8.9.

## Fixed

- **Glow no longer whites out the frame under a fading full-screen mesh**
  (board #2742, from manta-recon). Babylon's glow layer ignores opacity: it
  never reads `mesh.visibility` and does not weight the colour by
  `material.alpha`. So manta's re-entry curtain, a full-screen emissive quad on
  every layer bit, bloomed at full strength while at 30% alpha, and the orbit
  view went white. The glow layer `<tosi-b3d>` builds now weights each mesh's
  emissive by `alpha × visibility`. Opaque, visible meshes glow exactly as before.
  A mesh hidden with `visibility = 0` no longer glows, so `excludeFromGlow` is
  needed only for emissive things that are not light sources.
- **The skybox no longer overwrites the scene's clear colour for a camera that
  cannot see it** (board #2865, from manta-recon). A camera whose `layerMask`
  excludes the dome is looking at another stage, which owns its own backdrop.
  The sky used to reset it to Babylon's default grey on every refresh, so
  manta's orbit view re-set black every frame. The sky re-applies its backdrop
  when the active camera changes back.

## Changed

- **Dev: tosijs-ui 1.16.5 and tosijs 1.10.7.** tosijs-ui 1.16 loads the doc
  site's entry once (tosijs-ui#191), so the static shadow-shader workaround in
  `demo/site.ts` is gone and the doc site renders shadows without it. That
  double load was also ensemble's `Cannot redefine property:
  onBeforeViewRenderObservable` (tosijs-3d#78). tosijs 1.10 dropped
  `Component`'s `[key: string]: any`, which surfaced 27 undeclared properties:
  `AbstractMesh` now declares `x`/`y`/`z`/`rx`/`ry`/`rz`/`axes`, `B3dBiped`
  declares `url`/`player`, and a dead `_jumpWas` store is gone. The peer range
  is unchanged (`tosijs ^1.9.2`).

## Added

- **`opacityWeightedGlow(layer)`** installs the same rule on a `GlowLayer` you
  build yourself.
