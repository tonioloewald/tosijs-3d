/*#
# cloud-field

**One cloud field, sampled by everything that needs it.** BILLOW noise, not
fBm — the absolute value creases the field at every zero crossing, which is what
makes cloud read as cauliflower instead of swell. A deck you can see, a
shadow on the ground, and a whiteout when you fly through it are three views of
the same weather — so they are three reads of one array rather than three
systems that have to be kept in agreement.

That agreement is the whole point. Recycling blobs cannot give it: the shadow
map is painted from where the blobs happen to be, so the shade underfoot never
quite belongs to the cloud overhead. Tonio: *"having a single decal (even if it
has less coverage) that is driven by the cloud shader logic seems like a
performance and appearance win."* It is both, and the appearance half is the
one you notice.

## Baked once, not evaluated per pixel

`cloudField` returns a **tileable** density array. Both consumers sample that
texture by world XZ rather than re-implementing the noise — which matters more
than it sounds, because the alternative is a pure TypeScript version and a GLSL
version that have to produce identical output forever. They would not. Every
"why is the shadow slightly off the cloud" bug lives in that gap, and baking
removes the gap rather than narrowing it.

`coverage` is deliberately NOT baked in. It is a threshold applied at sample
time, so weather is a live uniform on both the deck and its shadow and they
cannot disagree about it — clear to overcast with nothing regenerated.

## Cirrus vs cumulus is one dial

`cirrus` runs from rounded heaps to long wispy streaks, and it moves two things
together because one alone does not read: the noise domain is STRETCHED along a
heading (long), and the billow fold is inverted and narrowed into filaments
(wispy). Stretch on its own makes sausages; filaments on their own make a
scribble. Tonio asked for "more long and wispy vs more rounded" — those are the
two axes of the same request, so they are one control.

The stretch is free of seams because the two torus radii are independent: the
wrap comes from going round a circle, so any radii tile. **Which WAY the
streaks run is not baked at all** — rotating inside the bake does not tile
(`u` advances by `2π·cos θ` across the field, which only closes at right
angles), so the heading is a rotation of the sampler's UVs instead. A wrapped
texture read through a rotated UV has no seam, the repeat lattice simply sits
at an angle to the world — and changing the wind direction costs no rebake.

## Tileable by construction

Sampled on a torus, the same trick `water-normal` uses: the 2D position is
mapped onto two circles in 4D and read from 3D noise, so the field wraps in both
axes with no seam to hide. A cloud deck has to repeat — it covers the sky — and
a visible tile boundary is worse than no clouds.
*/
/*{ "parent": "environment", "order": 920 }*/
import { PerlinNoise } from './perlin-noise.js';
/**
 * A tileable cloud-density field in `[0,1]`, row-major, `size × size`.
 *
 * NO coverage threshold is applied — see the note above. This is the raw
 * density; what counts as cloud is decided at sample time by whoever is
 * looking, so the deck and its shadow share one live dial.
 */
export function cloudField(options = {}) {
    const size = options.size ?? 256;
    const frequency = options.frequency ?? 3;
    const octaves = options.octaves ?? 6;
    const persistence = options.persistence ?? 0.58;
    const cirrus = Math.min(1, Math.max(-1, options.cirrus ?? 0));
    // How wispy is the MAGNITUDE; which way the streaks run is the sign.
    const wisp = Math.abs(cirrus);
    const noise = new PerlinNoise(options.seed ?? 1337);
    /*
    STRETCH THE DOMAIN, not the output. The two torus radii need not match and
    need not be integers — the wrap comes from going round a circle, so ANY radii
    tile. That is what makes anisotropy free here: a stretched cloud is the same
    construction read at two scales, not a resampling that has to be re-seamed.
    */
    const stretchU = cirrus > 0 ? 1 + cirrus * 5 : 1;
    const stretchV = cirrus < 0 ? 1 - cirrus * 5 : 1;
    const out = new Float32Array(size * size);
    let min = Infinity;
    let max = -Infinity;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            /*
            ON A TORUS, so the field wraps. `u` and `v` go round two circles and the
            noise is read in 3D — the seam cannot exist rather than being hidden,
            which is the same construction `water-normal` uses and for the same
            reason.
            */
            const u = (x / size) * Math.PI * 2;
            const v = (y / size) * Math.PI * 2;
            let amp = 1;
            let freq = frequency;
            let sum = 0;
            let norm = 0;
            for (let o = 0; o < octaves; o++) {
                const r = freq / (Math.PI * 2);
                // Along the streaks the field varies SLOWLY; across them, at full rate.
                const ru = r / stretchU;
                const rv = r / stretchV;
                const n = noise.noise3D(ru * Math.cos(u), ru * Math.sin(u), rv * Math.cos(v) + rv * Math.sin(v));
                const f = Math.abs(n);
                /*
                BILLOW, NOT fBm — `abs`, and this one character is the difference
                between cloud and sea.
        
                Plain fBm is smooth on both sides of zero, so its gradient rolls: broad
                swells with long shoulders, which is exactly what an ocean shader wants
                and exactly why the first pass read as water however white it was
                painted. Tonio: "So it shouldn't look at all like water."
        
                Taking the absolute value folds the negative lobe up, putting a CREASE
                at every zero crossing. The highs become rounded lumps separated by
                sharp valleys — cauliflower rather than swell — and because the relief
                here is derived from the field's own gradient, the shading inherits that
                character for free.
                */
                sum += amp * f;
                norm += amp;
                amp *= persistence;
                freq *= 2;
            }
            /*
            THINNED, not re-shaped. Cirrus is the same billow noise seen sideways and
            stretched thin — and getting there by a different noise TRANSFORM was two
            failed attempts, both worth recording because they failed the same way.
      
            A filament along the zero contour (windowed, so it really was a thread)
            produces exactly what the maths promises and it is wrong: a noise contour
            is a long SMOOTH CURVE, so the sky fills with unbroken parallel lines that
            read as telephone wires. Breaking them up with the finer octaves did not
            help — the wires just became dashed wires.
      
            What actually reads as wisp is a LUMPY streak: billow, stretched along the
            wind, and then thinned by contrast so only the cores survive and the
            shoulders fall away to clear sky. The lumps are what stop it looking
            drawn, the stretch is what makes it long, and the exponent is what makes
            it wispy instead of merely elongated.
            */
            const raw = sum / norm;
            const value = wisp > 0 ? Math.pow(raw, 1 + wisp * 3.5) : raw;
            out[y * size + x] = value;
            if (value < min)
                min = value;
            if (value > max)
                max = value;
        }
    }
    /*
    NORMALISE BY PERCENTILE, not by the extremes.
  
    Two problems with min/max, and the second is the one that bites. fBm does not
    fill its nominal range — the octaves rarely align — so a raw field sits in a
    narrow band around the middle and `coverage` does almost nothing across most
    of its travel. That much min/max also fixes.
  
    What it cannot fix is that the extremes are a SAMPLE OF TWO. One unusually
    bright pixel sets the scale for the whole sky, so the same weather rescales
    when the seed changes, when the resolution changes, and — the visible case —
    as `cirrus` is dialled: at 0.4 the filament peak starts winning the maximum
    and everything else is compressed under it, a 0.1 step in the mean from a 0.1
    step on the slider. The dial had a cliff in the middle of it.
  
    Percentiles have no such dependence on one pixel, so the dial is smooth, the
    dial is seed-independent, and `coverage` finally means one thing: at `c` the
    threshold sits at the same place in the DISTRIBUTION whatever kind of cloud
    this is. Clipped tails are wanted, not tolerated — a cloud core should be
    solid white and a gap should be properly empty.
  
    Histogram rather than a sort: this runs over a quarter of a million texels at
    the default size, and the bin width is far below anything the ramp that reads
    it can resolve.
    */
    const BINS = 2048;
    const TAIL = 0.02;
    const span0 = max - min || 1;
    const hist = new Int32Array(BINS);
    for (let i = 0; i < out.length; i++) {
        const b = Math.min(BINS - 1, Math.floor(((out[i] - min) / span0) * BINS));
        hist[b]++;
    }
    const pick = (fraction) => {
        const want = fraction * out.length;
        let seen = 0;
        for (let b = 0; b < BINS; b++) {
            seen += hist[b];
            if (seen >= want)
                return min + ((b + 0.5) / BINS) * span0;
        }
        return max;
    };
    const lo = pick(TAIL);
    const hi = pick(1 - TAIL);
    const span = hi - lo || 1;
    for (let i = 0; i < out.length; i++) {
        const v = (out[i] - lo) / span;
        out[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    return out;
}
/**
 * How much cloud is at a density, for a given `coverage` — the shared rule.
 *
 * `coverage` 0 is clear sky and 1 is solid overcast, and the SOFTNESS of the
 * edge matters as much as the threshold: a hard cut reads as torn paper, so
 * this ramps over a band and the band narrows as the sky fills in. Overcast
 * has no visible edges because there is nothing left to be the edge of.
 */
export function cloudOpacity(density, coverage) {
    const c = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage;
    if (c <= 0)
        return 0;
    if (c >= 1)
        return 1;
    /*
    THE THRESHOLD IS SHAPED, not a straight `1 - c`.
  
    A linear threshold assumes the density is spread evenly through [0,1] and it
    is not: even after percentile normalisation the field piles up around its
    middle, so `c = 0.5` put the line at 0.5 — above the median — and half
    coverage rendered as thin scattered wisps with almost no solid core. You could
    see it from the ground and you could measure it flying through: the whiteout
    had nothing to fire on at the default weather.
  
    The exponent leans the line below the median at mid-dial, so half coverage
    means about half the sky has cloud in it and a quarter of it is solid. That is
    what "half covered" looks like out of a window.
    */
    const threshold = Math.pow(1 - c, 1.25);
    const softness = 0.14 * (1 - c) + 0.02;
    const t = (density - threshold + softness) / (softness * 2);
    return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
}
//# sourceMappingURL=cloud-field.js.map