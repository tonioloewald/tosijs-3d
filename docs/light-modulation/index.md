# Light programs

**A light's whole life as one curve.** Pure, deterministic, Babylon-free: the
model behind [[b3d-lamp]]'s flicker, pulse, beacon and fade. To see one run on a
real lamp and edit it, use [curve-program](/curve-program/)'s demo.

## One curve, two split points

A channel is a single `[0,1] → [0,1]` curve spanning the lamp's entire
behaviour, divided by two markers:

```
   0 ─────────── attackEnd ──────────── sustainEnd ─────────── 1
   |   ATTACK        |       SUSTAIN         |      DECAY      |
   | plays once,     | loops while on,       | plays once,     |
   | on switch-on    | one pass per `period` | on switch-off   |
```

**The seams cannot jump, because there is only one curve**: the value at
`attackEnd` is reached from the left by the attack and held from the right by
the sustain. So **the curve's value at `attackEnd` IS the sustain level**;
there is no separate level to declare.

**Flicker does not compose across regions.** The decay plays what the decay
region draws. A fluorescent flickers to life because its attack is drawn that
way; to make a lamp flicker as it dies, draw the flicker into the decay.

## The contract

- **Inverted splits collapse.** If `sustainEnd` precedes `attackEnd` (only
  reachable by hand-editing a file; the editor clamps a drag), the sustain
  collapses to zero width at `attackEnd`: the lamp plays its attack, holds at
  `attackEnd` while on, then plays the decay from `sustainEnd`. This is
  specified, so a validator may treat it as a warning; changing it is a
  breaking change.
- **Two discontinuities remain.** *Shut off mid-loop*: the decay begins at
  `sustainEnd` wherever the sustain was, so keep the two ends of the sustain
  near each other in value. *Shut off while spinning up*: the decay starts at
  `sustainEnd` however far the attack had climbed.
- **Duration is one number, divided by the markers.** `duration` is the whole
  curve's time and each segment takes the share it occupies (`attackEnd: 0.2,
  duration: 1` is a 0.2 s attack), so dragging a marker retimes the lamp.
  `attack` / `period` / `decay` override individually, for a slow fade off a
  fast strike.
- **No randomness.** Flicker is authored: give the sustain several dissimilar
  peaks and a period that is not a round number. That keeps it repeatable,
  editable and testable.

`DEFAULT_PROGRAM` is up fast, hold, down fast, in one second.

## Channels

| channel | curve value means | why |
| --- | --- | --- |
| `brightness` | **multiplies** the base intensity — `0` off, `1` as declared | "off" has to be reachable; it is the value you flicker to |
| `range` | **multiplies** the base range | a range of zero is a light that lights nothing |
| `saturation` | **multiplies** saturation — `0` is white, `saturationScale` sets what `1` means | saturation has a meaningful zero and reaching it is the point |
| `hue` | **shifts** the base hue, `0.5` = unchanged, scaled by `hueShiftDeg` | hue is circular with no meaningful zero, so an absolute mapping would discard the colour you chose |

**A pale lamp cannot be reddened by hue alone.** Rotating a hue keeps the
saturation, so `#cfe8ff` (saturation 0.19) turns pale orange however far you
turn it. To make it die as a red ember, raise saturation too, with
`saturationScale` above 1.

**The hue shift is relative.** `#cfe8ff` sits near 207°, so `hueShiftDeg: 45`
takes it to cyan; it needs about 190 to reach amber. The default 30 is for
leaning, not for changing a lamp's colour.

## Presets

`lightPresets` / `lightPreset(name)`: **steady**, **fluorescent**, **flickery**,
**brownout**, **candle**, **fireplace**. They are brightness-first: colour
belongs to the lamp (a candle is warm because its `diffuse` is warm). The two
that touch colour only lean it: a brownout pulls warm as a sagging filament
does, and a fire runs yellower in its flares and redder in its lulls.

## API

`sampleLight(program, on, sinceChange)` gives the channel values `sinceChange`
seconds after the lamp was last switched; `lightPhase` and `programPosition`
(same arguments) say where in its life it is. `lightProgramSchema()`,
`canonicalProgram` and `validateProgram` handle a program as a document.
