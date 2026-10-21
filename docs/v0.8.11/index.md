# 0.8.11

<!--{ "parent": "CHANGELOG", "order": 9991989 }-->

**Ambient occlusion.** One attribute on `<tosi-b3d>`, off by default. Checked
flat; `always` (the in-headset setting) is not yet verified per eye on a
device, and this release is partly so that it can be.

## Added

- **Ambient occlusion: `<tosi-b3d ssao>`.** `off` (default), `auto` (on where
  the device tier affords it), `on`, or `always`. `auto` and `on` are
  flat-only; `always` also runs in a headset, for hardware that can pay.
  `ssaoStrength` and `ssaoRadius` tune the look; samples and resolution come
  from the device budget (`PerfBudgets.ssao`, `ssaoSamples`, `ssaoRatio`).
  Corners, stacked crates and the foot of a wall get darker, which is most of
  what makes simple geometry look placed rather than pasted. Measured on an
  M5 Max: about +1.2 ms a frame at 1344x640, scaling with pixel count. The
  depth-and-normals pass is built at the SSAO's own resolution, which measured
  40% cheaper than Babylon's default with no visible difference. Sky, water,
  cloud deck, terrain and skinned characters all checked clean. New page:
  Effects → Ambient occlusion, with a small scene to test in a headset.
