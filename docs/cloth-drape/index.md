# cloth drape

**Cloth laid over a body instead of cut from its skin.** An outline drawn in
the front view is a pattern piece: flat cloth is meshed from it, a front and
a back, laid on the body and settled. Where the outline goes past the body's
edge (between the legs, under an arm, out at a flared hem) the two pieces are
SEWN together and hang there; where it crosses the body (a neckline, a
waist, a cuff) they stay open, pinned to the skin. The cloth then bridges the
hollows a skin cut follows (between the breasts, the small of the back) and
falls where nothing holds it up.

```javascript
import { remesh, drapeGarment } from 'tosijs-3d'
const dummy = remesh(body.positions, body.indices, { edge: 0.02 })
const dress = drapeGarment(dummy, body.positions, {
  front: [[[-0.2, 1.45], [0.2, 1.45], [0.35, 0.5], [-0.35, 0.5]]],
})
// a GarmentCut: bound to the body like any cut, drawn with fitProxy
```

It works on the tailor's DUMMY ([remesh](/remesh/)): the even surface laid
over the body is what the cloth is placed on and collides with, and each
vertex of the settled cloth is bound to the body through it (its nearest
point on the body, plus its offset), so it is worn exactly like a cut
garment.

THE STEPS:

1. **The piece**: the outline's edge resampled to the cloth's edge length,
   triangulated, then remeshed flat so its triangles are even.
2. **Lift**: each vertex goes onto the front of the body (front piece) or the
   back (back piece) along the view direction, `thickness` out. Vertices
   whose ray misses the body are filled in from their neighbours, and the
   edge outside the body is shared by both pieces: the seam.
3. **Bridge**: a few passes pull each free vertex toward its neighbours and
   back out of the body, as cloth under a little tension does. Its lengths
   then are the cloth's.
4. **Settle**: gravity, the lengths held (position-based dynamics), the body
   pushed out of, the open edges pinned, until it stops.

Pure: the dummy and the body's positions in, a `GarmentCut` out.
