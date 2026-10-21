# 0.8.12

<!--{ "parent": "CHANGELOG", "order": 9991988 }-->

**0.8.11's ambient occlusion broke VR, and this takes it out of the headset.**
Also: headset popups can be dragged and closed, and a model no longer shields
itself from a blast. The headset fixes were verified in an EMULATED headset
(a fake WebXR device in headless Chrome), not yet on a device.

## Fixed

- **SSAO broke VR.** With `ssao="always"` a headset drew one image stretched
  across both eyes, and `on` put the same chain on the headset camera for the
  moment of entry. A post-process chain on a WebXR camera does not render per
  eye. SSAO is now removed before the headset camera takes over and
  restored when the session ends.
- **Popups in a headset could not be dragged or closed by their title bar.**
  Three causes, all found by driving an emulated controller:
  - the press was re-cast along Babylon's XR pointer ray, which is cut to the
    exact distance of what it hit, so the re-cast stopped a rounding error
    short of the popup and missed;
  - a drag that did start was cancelled by the first pointer move, because
    Babylon's XR moves carry `button: 0` and the drag behaviour reads that as
    "another button pressed";
  - a popup torn off a tilted panel (the headset settings panel is tilted)
    snapped upright, and the drag then threw it metres away.
  The settings panel's own occlusion re-pick had the same cut-ray fault.
- **A model's own hull shielded it from every blast.** Blast line of sight
  exempted only the node each destroyable registered, and a library model
  registers a root with the hull as a child, so the ray to it stopped on its
  own hull. An aircraft with `destroyable="on"` took no blast damage, its own
  bomb included. Anything beneath a destroyable is now not cover; a wall
  still is. From manta-recon (board #2906).

## Changed

- **SSAO is flat-only, and `ssao="always"` is deprecated.** 0.8.11 said
  `always` ran in a headset. It is the setting that broke the frame. It is
  still accepted, means `on`, and warns once.
