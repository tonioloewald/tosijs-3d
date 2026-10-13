# panel-orbit

**Where a spatial panel sits, and how dragging moves it.** Pure — no Babylon, no
DOM — so the placement rule can be tested without a headset.

A panel in a headset is parented to a reference frame at a fixed local offset:
rock-steady relative to you, and something you can point at. What it has not had
is a way to *move* it, so a panel seated above your eyeline had to be read by
looking up while you edited something below you.

## It rides a sphere

Tonio: *"Panel dragging seems simple enough. Drag it on the surface of a sphere
around its rig anchor."* That is the whole model, and it is worth saying why it
is better than the obvious alternative of dragging it on a plane:

| | on a sphere | free in space |
| --- | --- | --- |
| distance | **constant** — it cannot be shoved into your face or out of reach | drifts every drag |
| facing | falls out — it always looks back at the centre | needs its own billboard rule |
| what you control | two angles | six degrees of freedom, by accident |
| losing it | bounded by the clamps below | trivial |

So the state is two angles and a radius, the radius does not change while you
drag, and the panel re-aims at the anchor after every move. Nothing needs to
remember a pose.

## A limit you can feel, not one you hit

A hard stop is the right RESTING behaviour and the wrong LIVE one. The panel
simply stops following your hand, and in a headset — where the only feedback is
what you can see — that reads as a dropped drag rather than a limit. Tonio: *"It
could follow you and rubber band back."*

So a drag past a limit keeps following you and stiffens (`bandOrbit`,
`rubberBand`), and letting go springs back to the clamp (`clampOrbit`). The two
together are what make it a band rather than simply a bigger box: the panel may
PASS a limit, and may never come to REST past one.

`rubberBand` is `max · (1 - e^(-over/max))`, which earns its place over a linear
scale with a cap three times over — it starts at 1:1 so a small overshoot feels
like nothing unusual, it stiffens smoothly rather than arriving at a second hard
stop, and it asymptotes, so pulling harder never takes the panel anywhere new.

## The clamps exist because you cannot chase what you cannot see

`elevationDeg` stops short of straight up and well short of straight down, and
`azimuthDeg` stops before the panel goes behind you.

That is not tidiness. **The controls for recovering a lost panel are ON the
panel** — Exit VR and Re-seat live in its header — so a panel dragged behind
your shoulder is one you cannot reach the recovery button of. A clamp you
occasionally notice is much cheaper than a session you have to end by taking the
headset off.

Straight up is excluded for a second reason: azimuth is undefined at the pole,
so a drag through it would spin the panel around a direction you did not choose.
