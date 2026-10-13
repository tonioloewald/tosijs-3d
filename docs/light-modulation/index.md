# Light programs

**A light's whole life as one curve.** Pure, deterministic, Babylon-free — the
model behind [[b3d-lamp]]'s flicker, pulse, beacon and fade.

## One curve, two split points

A channel is a single `[0,1] → [0,1]` curve from [[curve|curve.ts]] spanning the
lamp's entire behaviour, divided by two markers:

```
   0 ─────────── attackEnd ──────────── sustainEnd ─────────── 1
   |   ATTACK        |       SUSTAIN         |      DECAY      |
   | plays once,     | loops while on,       | plays once,     |
   | on switch-on    | one pass per `period` | on switch-off   |
```

Tonio: _"if one curve covers attack - sustain - decay and you simply move the
point where attack becomes sustain and sustain becomes decay then the only real
discontinuities will occur mid-loop shut off or shut off while spinning up."_

That is exactly right, and it is why this shape is worth the constraint it
imposes. **The seams cannot be discontinuous, because there is only one curve** —
the value at `attackEnd` is reached from the left by the attack and held from the
right by the sustain, so they agree by construction rather than by two numbers
being kept in sync by hand.

It follows that **the curve's value at `attackEnd` IS the sustain level.** There
is no separate level to declare, and none to get wrong.

## What it gives up, and why that is fine

A separate loop multiplied by an envelope would let a flicker keep flickering
*through* the fade for free. Here it does not: the decay segment plays what the
decay segment draws.

Tonio, choosing this deliberately: _"you might not want flicker to compose. The
classic fluorescent light flickers to life. And if you want the lamp to flicker
as it dies, make it flicker as it dies. OK you won't get some kind of organic
composition, but that's something we can always come down to and this case is
both simple and extremely powerful."_

So: author the tail you want. Composition remains available later as an addition,
which is the safe direction to leave a door open in.

## Inverted splits collapse — a specified contract, not an accident

If `sustainEnd` precedes `attackEnd` (only reachable by hand-editing a file —
the editor clamps a drag so it cannot happen), the sustain segment **collapses to
zero width at `attackEnd`**: the lamp plays its attack, then holds at
`attackEnd` for as long as it is on, then plays the decay from `sustainEnd`.

Stated here because ensemble's validator calls this a WARNING rather than an
error, and that is only correct while the behaviour is deterministic and
specified. Their condition, and it is a fair one: _"if it were unspecified —
different results across versions or platforms — it should be an error, because
then the document really does not mean one thing."_ So this paragraph is part of
the contract, and changing what the collapse does is a breaking change.

## The two discontinuities that remain

Both are named above and neither is fixable in this model, so they are contracts
rather than bugs:

- **Shut off mid-loop.** The sustain is somewhere inside its segment; the decay
  begins at `sustainEnd`. Keep the two ends of the sustain segment near each
  other in value and the jump is invisible — a loop that returns near where it
  started is a better loop anyway.
- **Shut off while spinning up.** The decay starts at `sustainEnd` regardless of
  how far the attack had climbed.

## The channels do NOT share a convention, deliberately

| channel | curve value means | why |
| --- | --- | --- |
| `brightness` | **multiplies** the base intensity — `0` off, `1` as declared | "off" has to be reachable; it is the value you flicker to |
| `range` | **multiplies** the base range | a range of zero is a light that lights nothing |
| `saturation` | **multiplies** saturation — `0` is white, `saturationScale` sets what `1` means | saturation has a meaningful zero and reaching it is the point |
| `hue` | **shifts** the base hue, `0.5` = unchanged, scaled by `hueShiftDeg` | hue is circular with no meaningful zero, so an absolute mapping would discard the colour you chose |

**A pale lamp cannot be reddened by hue alone.** Rotating a hue preserves
saturation, so `#cfe8ff` — saturation 0.19 — becomes a pale orange however far
you turn it. To make a washed-out tube die as a red ember you have to raise
saturation too, which needs `saturationScale` above 1, because the curve itself
is `[0,1]` and can only desaturate. Found by measuring a demo that looked wrong:
the light reported `[1, 0.92, 0.87]`, which is warm white.

**The hue shift is RELATIVE, and that catches people.** "Fade out and go red" is
a small shift from a warm white and a very large one from a cool one: `#cfe8ff`
sits near 207°, so a plausible-looking `hueShiftDeg: 45` takes a dying
fluorescent to *cyan* — it needs about 190 to reach amber. Caught on the live
page doing exactly that. The default 30 is for leaning, not for changing a
lamp's mind.

## Duration: one number, divided by the markers

The split points already say how the time divides, so stating it three times is
three chances to disagree. `duration` is the whole curve's time and each segment
takes the share it occupies — `attackEnd: 0.2, duration: 1` is a 0.2s attack.
Dragging a marker therefore **retimes the lamp without touching a number**, which
is what makes the marker feel like it edits the behaviour rather than the shape.

`attack` / `period` / `decay` still override individually, because "a slow fade
off a fast strike" is a real lamp and a proportion cannot express it.

`DEFAULT_PROGRAM` is up fast, hold, down fast, in one second — a lamp with no
program switches instantly, which is right for a torch and wrong for nearly
everything else.

## Presets

`lightPresets` / `lightPreset(name)`: **steady**, **fluorescent**, **flickery**,
**brownout**, **candle**, **fireplace**.

They are BRIGHTNESS-first on purpose. Colour belongs to the lamp — a candle is
warm because its `diffuse` is warm — so a preset that forced hue would fight the
thing it decorates and stop composing with any base colour. The two that do
touch colour only lean it: a brownout pulls warm because a filament does when
the voltage sags, and a fire runs yellower in its flares and redder in its lulls.

Their irregularity comes from dissimilar peaks over a period that is not a round
number — never from randomness, which would cost repeatability, editability and
testability at once.

## Flicker is a curve, not a random number

A stepped curve strobes. A spiky attack segment is a fluorescent striking. A slow
`easeInOut` sustain is a beacon. All authored, repeatable, and editable in
[[curve-field|curve3d]] — where a `Math.random()` flicker would be none of those,
and would break the no-`Math.random` rule that makes this testable at all.

For flicker that should not read as periodic, give the sustain segment several
dissimilar peaks and a period that is not a round number.
