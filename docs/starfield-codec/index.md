# starfield-codec

**A starfield is DATA, not a picture — so store it as data.** Six small RGBA
faces where the channels are not colour but *position, brightness, colour index
and size*, one object per texel, decoded in the sky shader into points that are
sharp at any field of view.

The data cube is a quarter of the VRAM a raster sky needs (25 MiB for the
256 smooth cube plus the 1024 data cube, against 96 MiB for a 2048 raster), and
it is **resolution-independent**: a decoded star is a point evaluated per
fragment, so it stays a point at any field of view. Nebulae, which are smooth,
go in the small cube; stars and distant galaxies (small discs, using the size
field) go here. Why the encoding is this shape (the measurements behind the split and the
packing) is in [GALAXY-DESIGN.md](https://github.com/tonioloewald/tosijs-3d/blob/main/GALAXY-DESIGN.md#the-starfield-codec--the-sky-as-data).

## The layout

| channel | carries |
| --- | --- |
| R | sub-texel u, so position survives the quantisation |
| G | sub-texel v |
| B | brightness, gamma-encoded. **`0` means empty** — that is what makes a mostly-black sky compress |
| A | the precision budget: `0` empty, `1` faint warm yellow, `2–31` a galaxy disc's size, `32–255` a bright star's spectral value (224 steps, decoded through a continuous ramp) |

A crowded texel PACKS rather than dropping objects: `B = 255` (`PACKED_FLAG`)
marks up to three objects at eight bits each. Where even that is full, the
brightest are kept, so the loss lands on the faintest stars in an
already-blurred dense core.

`encodeStarfield` builds the six faces from a list of `SkyObject`s;
`decodeTexel` reads one back; `spectralGlsl` and `paletteGlsl` give the shader
the matching decoders.

## ⚠️ The face convention is load-bearing

Encoder and shader must agree about which face a direction lands on and which
way u and v run, or every star is in the wrong place — and it will look
plausible, because a wrong starfield is still a starfield. {@link dirToFace}
implements the OpenGL cube convention that `textureCube` uses, and
{@link faceToDir} inverts it; `starfield-codec.test.ts` round-trips random
directions through both, which is the only way this stays honest.
