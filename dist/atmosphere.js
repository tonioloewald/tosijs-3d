/*#
# atmosphere

**Fog is never switched on. It is always on, and systems _lean_ on it.**

Underwater, inside a cloud, out in space — each is a *layer* that pulls the fog toward its
own colour and density by a weight of 0…1. The layers composite, and the result is smoothed
over time. Nothing ever toggles.

## Why (the "thunk")

Fog used to be snapped on at the water's surface (illustrative — NOT runnable, which is
why this block is `javascript` not `js`: the doc system SMOKE-TESTS every `js` example, and
this pseudocode's identifiers are all undefined):

```javascript
if (underwater && !wasUnderwater) { scene.fogMode = EXP2; fogColor = blue; fogDensity = 0.12 }
```

That's **two** discontinuities in one line:

1. **`fogMode` changes the shader's DEFINES**, so every material is recompiled. That's a
   real frame hitch, not just a visual pop — the thunk you feel is mostly the compiler.
2. **Colour and density jump instantly** at the exact plane of the surface.

So: **the mode is set once and never changes** (it's a shader permutation), and only the
*uniforms* — colour, density, start, end — are modulated. A layer's weight ramps over a
band rather than flipping at a boundary, and a short temporal smooth mops up whatever's
left.

The same mechanism handles every "you are somewhere else now" transition. It isn't three
special cases; it's one:

| layer | weight ramps with |
|---|---|
| **underwater** | depth below the surface (over a band, not a plane) |
| **cloud** | *approach* to the blob — white before you'd ever touch the geometry |
| **space** | altitude leaving the atmosphere: density → 0, colour → black |

## The pure part

`compositeFog` is a pure function — layers in, fog state out. No Babylon, no scene, so the
blending is unit-testable without an engine, which is the point: this is the code that makes
a transition *feel* right, and feel is worth pinning down.
*/
/*{ "parent": "Environment" }*/
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
/**
 * Composite layers over a base, in order. Each pulls the running state toward itself by its
 * weight — so a half-submerged camera is half-way to underwater, and a cloud you're just
 * brushing barely whitens.
 */
export function compositeFog(base, layers) {
    const out = {
        color: { ...base.color },
        density: base.density,
        start: base.start,
        end: base.end,
    };
    for (const layer of layers) {
        const w = clamp01(layer.weight);
        if (w <= 0)
            continue;
        if (layer.color) {
            out.color.r = lerp(out.color.r, layer.color.r, w);
            out.color.g = lerp(out.color.g, layer.color.g, w);
            out.color.b = lerp(out.color.b, layer.color.b, w);
        }
        if (layer.density !== undefined)
            out.density = lerp(out.density, layer.density, w);
        if (layer.start !== undefined)
            out.start = lerp(out.start, layer.start, w);
        if (layer.end !== undefined)
            out.end = lerp(out.end, layer.end, w);
    }
    return out;
}
/**
 * Move `current` toward `target` with a time constant — frame-rate independent, so it feels
 * the same at 60 and at 90. This is the last line of defence against a pop: even if a layer's
 * weight jumps (a cloud recycles behind you, a camera teleports), the *fog* eases.
 *
 * `tau` is the time to close ~63% of the gap. ~0.25s reads as "instant but not jarring".
 */
export function approachFog(current, target, dt, tau = 0.25) {
    const k = tau <= 0 ? 1 : 1 - Math.exp(-dt / tau);
    return {
        color: {
            r: lerp(current.color.r, target.color.r, k),
            g: lerp(current.color.g, target.color.g, k),
            b: lerp(current.color.b, target.color.b, k),
        },
        density: lerp(current.density, target.density, k),
        start: lerp(current.start, target.start, k),
        end: lerp(current.end, target.end, k),
    };
}
/**
 * Weight for a **band** transition: 0 outside, 1 past `full`, smoothly between. Use it for
 * anything that would otherwise flip at a boundary.
 *
 * The water surface is the canonical case: a plane test (`camY < waterY`) snaps, and you feel
 * it. A band over even a metre or two reads as *entering* the water rather than teleporting
 * into it.
 */
export function band(value, startAt, full) {
    if (startAt === full)
        return value >= full ? 1 : 0;
    const t = (value - startAt) / (full - startAt);
    const c = clamp01(t);
    return c * c * (3 - 2 * c); // smoothstep — no crease at either end
}
//# sourceMappingURL=atmosphere.js.map