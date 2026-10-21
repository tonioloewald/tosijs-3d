# b3d-elevator

**A platform that goes up and down, and carries you with it.** Three ways to ask
it to move — it just runs, you stand on it, or you throw a switch — which are the
three an arena needs and the three that behave differently when something goes
wrong.

## Riding is free, and that is worth knowing

There is no code here that carries a passenger. `b3d-biped` already snaps its
feet to whatever is under them each frame, within `STEP_UP` (0.5m) and
`STEP_DOWN` (0.6m) — so a platform moving at a plausible speed moves perhaps
0.02m between frames and the character simply stays on it, going up or down.

That is the whole reason this element is small. A lift that grabs its riders has
to decide what a rider IS, what happens when one jumps, and how to hand them
back — and every one of those decisions is a bug waiting for an edge case. Here
the question is never asked.

⚠️ It stops being free if the platform outruns the snap: faster than about
`STEP_DOWN` per frame (roughly 36 m/s at 60fps) a descending platform drops out
from under you and you fall after it. That is a fine speed for a trap and a bad
one for a lift.

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `meshName` | `'elevator'` | The platform mesh's name |
| `mode` | `'cycle'` | `'cycle'` runs forever; `'pressure'` moves while something stands on it; `'switch'` waits for `call()` |
| `travel` | `3` | Metres between the bottom stop and the top |
| `stops` | `2` | How many stops, evenly spaced. `2` is bottom and top |
| `speed` | `1.2` | Metres per second |
| `pause` | `1.5` | Seconds held at each stop |
| `width`,`depth` | `2`,`2` | Platform size |
| `thickness` | `0.2` | Platform thickness — it gets a collision proxy like any thin solid |
| `color` | `'#8a8f98'` | |
