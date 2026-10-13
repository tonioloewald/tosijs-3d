# arc

**The pure model behind [[angle-field|angle3d and arc3d]].** An angle is a
direction; an arc is a direction *and* a width. No DOM, no Babylon — so the part
that is fiddliest to get right is the part a test can pin.

## An arc is a CENTRE and a WIDTH, not a start and an end

Offered as `start`/`end` the two can be dragged into meaninglessness, and the
interesting edit — *"same width, point it there"* — needs both moved together.
Centre-and-width makes that edit one number, and makes the two hard questions
one line each:

```javascript
arcContains(arc, angle)          // |wrap(angle − centre)| ≤ width / 2
arcWithinArc(inner, outer)       // ...and the widths differ by enough
```

Written as intervals those need four cases and a wrap check, and every consumer
would get one of them wrong. The interesting property is that **neither form
mentions where the arc starts**, so wrapping past north is not a special case —
it is unrepresentable.

## Degrees, and two different wraps

Per this library's convention the surface is degrees. Two wraps exist and they
are not interchangeable — see [[manipulator]], which owns both:

- `wrapDegrees` → `(-180, 180]`, for a DELTA or a difference. Signed, because
  turning back five degrees is −5 and calling it 355 sends you the long way.
- `normaliseDegrees` → `[0, 360)`, for a STORED angle, which has no direction to
  preserve and reads better without minus signs.

## A limit CATCHES, it does not jump

Drag past a stop and the handle stays at the stop. The alternative — snapping to
whichever end is nearer in wrapped distance — means dragging a hair past one
limit teleports the value to the other side of the dial, which is the worst
thing a constrained control can do. So `clampAngleToArc` picks the nearer END,
and the widget stops the gesture rather than restarting it elsewhere.

## An envelope EXPLAINS, it does not merely clamp

The motivating case: *"a game where you can place turrets on a ship and where it
goes restricts the firing arc and the placement of the gun."* A gun amidships on
the port rail bears from roughly 10° to 190°, and no placement lets it fire
through its own superstructure.

A control that silently snaps to a legal arc teaches nothing about why. So the
envelope is a first-class value the widget can DRAW — the permitted sector and
the blocked one — and clamping is what happens after you can see the reason.
