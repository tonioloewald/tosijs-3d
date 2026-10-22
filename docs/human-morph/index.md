# human-morph

The body sliders of the character creator (CHARACTER-DESIGN.md), as pure
functions over a [human pack](/human-pack/): which targets a body uses and how
much, and the sum that turns them into positions.

MakeHuman's macro targets are sculpted at the CORNERS of a grid: female or
male, baby, child, young or old, three muscle and three weight levels, and
three ancestries. A body between corners is a weighted mix of the corners
around it, and every slider is a position on one axis of that grid. The rules
here are written from MakeHuman's file names and documented behaviour; none of
their (AGPL) code is used.

The sliders, each from 0 to 1:

- **gender**: female at 0, male at 1
- **age**: 1 year at 0, 11 at 0.1875, 25 at 0.5, 90 at 1
- **muscle** and **weight**: least at 0, average at 0.5, most at 1
- **height**: shortest at 0, average for the rest of the body at 0.5, tallest at 1
- **proportions**: uncommon at 0, neutral at 0.5, ideal at 1

`african`, `asian` and `caucasian` are an ancestry MIX, normalised to sum to 1
(all zero is an even mix).

```javascript
const pack = await loadHumanPack(assetUrl('makehuman/hm08/hm08.json'))
const weights = macroWeights({ ...DEFAULT_HUMAN_BODY, height: 0.9 }, (n) => pack.has(n))
const positions = await morphHuman(pack, weights)
```

A dense macro costs about 0.03 ms to add on a desktop, so a body is morphed on
the spot rather than in a worker.
