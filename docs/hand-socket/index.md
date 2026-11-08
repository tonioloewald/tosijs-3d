# hand socket

**Where a hand holds things, on any rig.** A hand bone's axes are the rig
maker's choice, so a grip dialled in against one rig's bone holds the item at
a wrong angle on another. A hand's SOCKET is a frame under the hand set by its
ANATOMY instead (the forearm's direction, the thumb's side), calibrated so
that on UAL's mannequin it is the hand bone itself. A grip (see
[[hold-grip]]) is a point and a turn in that frame, so one set of numbers
holds an item the same way in every hand.

This is the arithmetic, with no engine. `handSocket` in
[[b3d-launcher|the launcher]] runs it on a Babylon skeleton (the character
builder's Hold), and `riggedBodyGlb`'s `held` option on an exported body, so
the socket in a file is where the builder shows it.

```javascript
import { socketWorld, gripMatrix, gripPoint, mat4Multiply } from 'tosijs-3d/hand-socket'

// Joint positions in the scene's frame (Babylon's, left-handed).
const socket = socketWorld('r', hand, lowerarm, thumb)
const grip = mat4Multiply(gripMatrix({ x, y, z, rx, ry, rz }), socket)
gripPoint(itemPositions) // the middle of the item's lowest third
```

Matrices are Babylon's layout: 16 numbers, row-major, for ROW vectors
(`p' = p·M`, so `a·b` is a then b). A grip's turn is Babylon's
`Quaternion.FromEulerAngles(rx, ry, rz)` in degrees (yaw about y, then pitch
about x, then roll about z).

Pure: no DOM, no Babylon.
