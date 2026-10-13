# curve

**The pure model behind [[curve-field|curve3d]]** — a continuous function from
`[0,1]` to itself, as sorted control points, with the editing rules that keep it
valid. Babylon-free, DOM-free, unit-tested.

## The range is CLOSED, and that is load-bearing

A curve cannot return 1.4. Tonio: _"let's assume we don't allow mapping outside
of `[0,1]` and instead scale the terrain block to avoid playing badly with
carving"._

A profile that can exceed its range silently changes the height a province
occupies, and that is precisely what [[carve]]/[[patch-field]] must agree about —
a bore cut against a heightfield that has since grown is a hole in the wrong
place, and it fails as *geometry*, reporting nothing. So **amplitude belongs to
the block and shape belongs to the curve**, and a drag clamps rather than
pushing the range.

## Two kinds, one difference

- **`profile`** — remaps a value. Both endpoints free.
- **`falloff`** — weight against normalised distance (`0` at the province centre,
  `1` at its extent). **Pinned to 0 at x = 1.** A province still carrying weight
  at its boundary does not blend into the terrain around it, and the result is a
  visible step at the footprint edge — the same silent geometry failure again.

## NOT monotonic

Tempting and wrong. A crater rim and a volcano's cone are non-monotonic
falloffs — they rise, then fall — and those are exactly the cases
`PROVINCE-DESIGN.md` says break the shared falloff deliberately. Pin the edge;
leave the middle alone.

## x is sorted, and a drag can reorder

Dragging a point past its neighbour is a legitimate edit, so `movePoint` returns
the point's **new index** along with the points. A caller that assumes the index
survived will start dragging a different point mid-gesture — which reads as the
curve fighting you.
