/*
One cloud field, sampled by everything that needs it: the deck, its ground
shadow and the whiteout are three reads of one baked, tileable array, so they
agree by construction. Billow noise on a torus; coverage is a sample-time
threshold, cirrus stretches the domain and narrows the billow into filaments,
and the streak heading is a UV rotation in the sampler (rotating inside the
bake would not tile). The reader-facing version is on the b3d-cloud-deck page,
under "The cloud field".
*/
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
    /*
    NEGATIVE CIRRUS IS POSITIVE CIRRUS TURNED A QUARTER, and it is computed that
    way: the same field with its two axes swapped. It used to stretch the other
    axis instead, and the two axes are not built alike (one goes round a full
    circle in the noise, the other along a single line of it), so the "same"
    wispiness across the wind had a quarter of the cloud: 5% of the sky over the
    half-way mark against 20% (Tonio: "negative cirrus seems to reduce cloud
    cover").
    */
    const across = cirrus < 0;
    const stretchU = 1 + wisp * 5;
    const stretchV = 1;
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
            const u = ((across ? y : x) / size) * Math.PI * 2;
            const v = ((across ? x : y) / size) * Math.PI * 2;
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
/**
 * **Orographic lift at one point**, 0–`strength`: how much MORE cloud high
 * ground makes here. `h` is the terrain height, `around` the mean height a
 * little way off, `sea` the sea level, `peak` the height ABOVE THE SEA at which
 * the lift is full.
 *
 * Two things make it, and both used to be missing:
 *
 * - **Height above the SEA, not above y = 0.** Measured from zero, a world
 *   whose sea sits at 147 m (Land and Sky) counted its entire landmass as
 *   mountain: every bit of land lifted +0.5 to +0.75 coverage, so a dial of
 *   0.3 rendered as a solid grey sheet with the gaps filled in (Tonio:
 *   "orographic is the problem. It fills the transparent areas without
 *   changing apparent cloud coverage").
 * - **A RIDGE, not a plateau.** What makes orographic cloud is air being
 *   pushed UP, so ground that stands above its surroundings lifts most; a high
 *   flat plain lifts a little (`PLATEAU_SHARE`), not fully.
 */
export function orographicLift(h, around, sea, peak, strength) {
    const s = Math.min(1, Math.max(0, strength));
    if (s <= 0)
        return 0;
    const p = Math.max(1, peak);
    const e = Math.min(1, Math.max(0, (h - sea) / p));
    const elevation = e * e * (3 - 2 * e);
    const ridge = Math.min(1, Math.max(0, (h - around) / (p * 0.25)));
    return s * elevation * (PLATEAU_SHARE + (1 - PLATEAU_SHARE) * ridge);
}
/** How much of the lift a high but FLAT plateau keeps (the rest is ridge). */
export const PLATEAU_SHARE = 0.35;
/** How far off (m) "around" is sampled for the ridge test. */
export const OROGRAPHIC_REACH = 900;
/**
 * **The deck's weather grid as texture bytes** (RG: field, gloom), rows
 * FLIPPED. The ground's vertex rows run from +Z down to -Z (row 0 is
 * z = +size/2), while a texture's row 0 is v = 0, which the deck shader's
 * window (`uv = (p - centre) / size + 0.5`) maps to -Z. Copied straight
 * across, the local field was mirrored north-south in everything that reads
 * the texture (coverage, storm gloom, cloud shadow): the lightning demo's
 * storm, 1.3 km off the deck's centre, was drawn 1.3 km the other way.
 */
export function packWeatherTexture(field, gloom, n) {
    const bytes = new Uint8Array(n * n * 2);
    for (let row = 0; row < n; row++) {
        const flipped = n - 1 - row;
        for (let col = 0; col < n; col++) {
            const k = row * n + col;
            const t = (flipped * n + col) * 2;
            bytes[t] = Math.round(field[k] * 255);
            bytes[t + 1] = gloom == null ? 0 : Math.round(gloom[k] * 255);
        }
    }
    return bytes;
}
//# sourceMappingURL=cloud-field.js.map