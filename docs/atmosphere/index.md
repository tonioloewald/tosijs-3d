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
