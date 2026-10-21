# 0.8.13

<!--{ "parent": "CHANGELOG", "order": 9991987 }-->

**A schema for `<tosi-b3d>` itself, and an emulated headset in the repo.**

## Added

- **`sceneSchemas.b3d` / `b3dSchema()`**: the host's scene-level attributes,
  with ranges, units and useful bands: `clearColor`, `glowLayerIntensity`,
  `ssao`, `ssaoStrength`, `ssaoRadius`, `timeScale`, `windSpeed`,
  `windBearingDeg`, `windGust`. The attributes that configure a viewer rather
  than a scene (camera limits, quality, pixel ratio, gamepad and panel chrome,
  XR and pause behaviour) are declined by name in `SCENE_OMITTED.b3d`. The
  drift test covers it like every other schema. `ssao` marks `always` in
  `x-deprecated-values`. Asked by tosijs-3d-ensemble (#101).
- **`bun run xr <path>`** (`bin/xr-emulate.ts`, repo tooling, not shipped): an
  emulated headset. Headless Chrome with a fake WebXR device enters VR on a
  page, screenshots both eyes and drives controllers from script. It is how
  0.8.12's headset fixes were found.
