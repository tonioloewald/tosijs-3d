# xr-frames

Reference frames for spatial XR UI. "Stable" in XR isn't one thing — there are
several distinct frames a piece of UI can be anchored to, and WebXR only hands
you the two extremes (world and head) plus the *sensed* points (hands), leaving
the comfortable middle (torso, neck) to be reconstructed. `XrFrames` maintains a
`TransformNode` for each so scene UI can just parent to the one it wants:

| Frame | Stable relative to… | Use |
|-------|---------------------|-----|
| `world` | the play space | a hologram on a table |
| `rig` | the locomotion rig (vehicle) | a piloting HUD that flies with you |
| `body` | your torso (head x/z + **damped** yaw) | waist inventory, over-shoulder backpack |
| `neck` | your neck pivot | UI you can look *past* |
| `face` | your eyes (head-locked) | a reticle, a vignette, sunglasses |

`body` and `neck` aren't measured by any sensor in a head-plus-hands rig, so they
are *inferred*: `body` low-passes the head's yaw (sustained turns move it, quick
glances don't) and sits at floor level under the head; `neck` is the head pose
pushed down-and-back to the pivot the head swings around. Hand frames come from
the controllers/`XRHand` joints (sensed) and are added separately.

The yaw-damping, gaze-reveal and angle math are pure (no Babylon) so they're unit
tested in `xr-frames.test.ts`.

## Example

XR-only (needs an immersive session). Spatial UI parents to a *frame* — `world`, `rig`, `body`,
`neck`, or `face` — so it stays where it should as you move:

```javascript
import { XrFrames } from 'tosijs-3d'
// XrFrames maintains a TransformNode per frame; parent a panel to `body` and it follows your torso
// (damped yaw) but not your gaze. See <tosi-b3d-panel> / frame-panel for the assembled spatial UI.
```
