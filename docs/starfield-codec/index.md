# starfield-codec

**A starfield is DATA, not a picture — so store it as data.** Six small RGBA
faces where the channels are not colour but *position, brightness, colour index
and size*, one object per texel, decoded in the sky shader into points that are
sharp at any field of view.

Tonio: *"Given a starfield background is a very specific kind of image I imagine
we could encode something very efficient in say a 512 or 1024 map by treating
the values as data."*

## Why, in numbers

A baked sky is a raster of something almost entirely empty. The 2048 cube it
replaces carried **25 million texels to describe about a hundred thousand
stars**, and it was 2048 only because stars smeared at 1024 — the nebulae never
needed it.

| | raster | data |
| --- | --- | --- |
| VRAM | 96 MiB (2048 cube) | 25 MiB (256 smooth + 1024 data) |
| on disk | 2.3 MB | about a quarter of that (moves with every rebake) |
| sharpness | fixed pixels — blurs as you zoom | **resolution-independent** |

The third row is the one that matters. A raster star is a smear of pixels baked
at one resolution; a decoded star is a point evaluated per fragment, so it stays
a point at any FOV. That is what 2048 was trying to buy and could not.

## The split is POINT-LIKE vs SMOOTH — measured, not assumed

Baking the nebula system alone at 256 and 1024 and comparing:

| | 256 | 1024 |
| --- | --- | --- |
| mean luminance | 3.838 | 3.839 |
| bright texels | 0.615% | 0.624% |
| peak luminance | 196 | 238 |

Energy and bright-area survive a 256 map almost exactly. What 256 costs is
PEAK, and it costs it on the point-like content — so nebulae belong in a small
smooth cube, while stars **and distant galaxies** belong here. A distant galaxy
is a small disc rather than a point, which is what the `size` field is for: the
same four bytes doing slightly more work rather than a third mechanism.

## Crowded texels PACK rather than drop

The encoding is a spatial hash, so objects can land on the same texel. The
birthday estimate says that is rare — and the birthday estimate assumes an
evenly spread sky, which **a galaxy is the exact opposite of**. Measured against
the real generator, one object per texel loses 21% of a galaxy at 512 and 7% at
1024, not the fractions of a percent the formula promises.

So a crowded texel switches layout instead: `B = 255` marks three objects at
eight bits each (`uu vv bbb c`), which recovers essentially all of them.

| cap | kept at 512 | kept at 1024 |
| --- | --- | --- |
| 1 | 78.8% | 93.0% |
| 2 | 93.7% | 99.1% |
| **3** | **98.0%** | 99.8% |

Crude on purpose: this layout only ever applies where objects are already inside
one texel of each other, which is the dense core, where they merge into a blur
and what survives is aggregate brightness rather than any individual star. And
what a full texel does drop is still chosen rather than arbitrary — **brightest
first**, so the loss lands on the faintest.

The table is measured at the default 10k-star galaxy. Loss rises with density
rather than staying at the birthday estimate, because a bigger galaxy is a
denser band: at the shipped 100k, cap 3 keeps **93.4%** at 1024 — and what goes
is, again, the faintest members of already-crowded texels in the band, where
stars overlap into blur.

## The layout

| channel | carries |
| --- | --- |
| R | sub-texel u, so position survives the quantisation |
| G | sub-texel v |
| B | brightness, gamma-encoded. **`0` means empty** — that is what makes a mostly-black sky compress |
| A | the precision budget: `0` empty, `1` faint warm yellow, `2–31` a galaxy disc's size, `32–255` a bright star's spectral value (224 steps, decoded through a continuous ramp) |

## ⚠️ The face convention is load-bearing

Encoder and shader must agree about which face a direction lands on and which
way u and v run, or every star is in the wrong place — and it will look
plausible, because a wrong starfield is still a starfield. {@link dirToFace}
implements the OpenGL cube convention that `textureCube` uses, and
{@link faceToDir} inverts it; `starfield-codec.test.ts` round-trips random
directions through both, which is the only way this stays honest.
