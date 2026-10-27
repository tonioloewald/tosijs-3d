# human-expression

A [character builder](/character-builder/) face that blinks, talks and
smiles. MakeHuman's CC0 face pose units (lids, jaw, lips, mouth corners,
brows, cheeks, tongue: 59 of them) are baked into the [human pack](/human-pack/)
as shape targets (`expression/<Unit>`), so at runtime an expression is only
weights: morph targets on the body, on the eyelashes, and on anything worn
on the face (a beard follows the jaw), with the body's skeleton untouched.

- `faceDeltas(pack, units)` loads the units' movements (xyz per pack vertex).
- `humanExpressions(scene, deltas)` makes the face; `attach(mesh, deltaFor)`
  adds a mesh that moves with it (`deltaFor` turns a pack-wide movement into
  that mesh's), and `layer(name)` is a set of weights (blink, speech, a
  mood), summed per unit, so behaviours never fight over a slider.
- `blinker(scene, face)` blinks at a person's rhythm: every 2 to 6 seconds,
  a quick close and a slower open, sometimes twice.
- `lidsFollow(scene, face, eyes)` drops the upper lids as the eyes look down
  and lifts them as they look up, as real lids do. Without it a downward
  look shows white above the iris and reads as a stare.
- `lipSync(scene, face, analyser)` mouths any Web Audio source by loudness
  (the jaw) and by where the sound's energy is (bright sounds widen the mouth,
  dark ones round it). No phonemes needed, so it works on any voice, live.
- `babble(scene, face)` talks with no audio at all: syllables at a speaking
  rate, phrases and pauses, for a crowd or a demo.

`VISEMES` are the mouth shapes as unit weights; `UNITS` lists every unit.
