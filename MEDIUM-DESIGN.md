# Medium — one idea for water, air, cloud, weather, vacuum

> Status: the **primitive** shipped in 0.7.0-beta.4 (`src/medium.ts`, pure, unit-tested).
> **§3 landed in 0.7.0-beta.5** as `MediumOptics` + `fogLayerFor`, marked EXPERIMENTAL and
> deliberately not load-bearing — `b3d-water` publishes its optics but still computes its
> own fog layer, because that path is verified and swapping it is a visual change.
> The §8 falsifier has been RUN and holds: one derivation reproduces water's numbers, a
> cloud bank's soft edge, and vacuum. §4–§6 are still design, not code.

## 1. The observation

Four things we built separately turn out to be the same thing:

| we called it          | it is                                             |
| --------------------- | ------------------------------------------------- |
| underwater fog + murk | a medium you are inside, tinting with depth       |
| cloud whiteout        | a medium you are inside, tinting with depth       |
| space (no fog)        | the absence of any medium                         |
| air fog `start`/`end` | a medium you are _always_ inside, on a flat world |

And three effects we would have built separately are one effect:

| we called it            | it is                             |
| ----------------------- | --------------------------------- |
| god rays through clouds | light scattering through a medium |
| underwater light shafts | light scattering through a medium |
| dusty shafts in a room  | light scattering through a medium |

They differ in **density, colour, and which light** — not in kind. That is the whole
argument for generalising, and it is Tonio's, from watching #15/#16 land next to
`b3d-clouds` and `atmosphere.ts`.

## 2. What exists now

`medium.ts` — geometry (`plane` | `sphere`), `band`, and the three questions: `depthIn`,
`submergence`, `crossing`. Plus `innermost` (nesting) and `dragAt` (the physical half).
`b3d.media` is the scene registry; `b3d-water` publishes itself into it.

**Deliberately unopinionated about rendering.** It answers questions; it does not own a
shader, a fog layer or a camera. That is what lets the projectiles, the vehicles and the
water all share it without depending on each other.

## 3. ⚠️ Optics: a medium should be able to describe how it LOOKS

Today every component hand-rolls a fog contribution (`b3d-water`, `b3d-clouds`,
`b3d-fog`), each re-deriving "how deep am I" from its own geometry. That duplication is
exactly what produced the #12/#15 collision, where the fogged sky and the transparent
Snell window disagreed about where the surface was.

The shape: optical fields on `Medium` (`fogColor`, `fogDensity`, `murk` per metre of
depth, `scattering`), and one derivation from medium + camera → `FogLayer`, feeding the
compositor that already exists in `atmosphere.ts`.

**Why this is not just tidiness:** it makes "how murky is it here" a single function that
the fog, the shafts, the underside shader and the LOD/culling can all call. Three
answers to that question is three chances to disagree at a boundary.

**Not decided:** whether `b3d-fog` becomes "the medium you are always in" (elegant, and it
makes a flat world a degenerate planet) or stays a separate base layer (less churn, and
the base fog is genuinely a scene-wide artistic choice rather than a substance).

## 4. ⚠️ Shafts: one effect, three appearances

Volumetric scattering parameterised by `(medium, lightDirection, submergence)`:

- **underwater** — shafts from the surface, strongest near it, fading with depth
- **clouds** — god rays where the sun breaks through
- **interior** — dust in a window's light

`b3d-sun` already dims with depth and already shares its direction, so the inputs are
present. The open question is the _implementation_, not the model: camera-facing textured
quads (cheap, reads well at a distance, breaks up close) versus a screen-space pass
(uniform, costs fill, and fill is what a headset has least of).

**Bias:** quads first. This is garnish, and garnish must be sheddable — see the ambient
budget, where the rule is that an effect which cannot be given its honest minimum
switches OFF rather than thinning into a lie.

## 5. ⚠️ The sky is what you see when the medium runs out

A skybox is not a separate concept: it is **the appearance of the outermost medium, or of
its absence**. Which makes the air→vacuum transition expressible with what already
exists — `submergence(camera, atmosphere)` is the cross-fade weight between a blue sky
and stars, and it is the same number that thins the fog.

This is the cleanest test of whether the abstraction is real, because nothing about it is
special-cased: a planet is a `sphere` medium with an atmosphere shell, and flying out of
it is the same maths as a submarine surfacing.

**Watch for:** the skybox is `infiniteDistance`, so it does not have a position and cannot
be "inside" anything. The medium test must be against the CAMERA, not the sky.

## 6. ⚠️ Transitions: the whiteout is where the drama is

`crossing` already reports entry and exit. The missing input is **how fast**, because
that is what separates a wade from a belly-flop and a re-entry from a docking:

- **splash** — water entry/exit, intensity from the normal component of velocity
- **plasma** — atmospheric entry, intensity from speed against a shell
- **cloud** — entering a cloud bank, already prototyped in `b3d-clouds`

One effect, one intensity input, three dressings. The engine should say _what happened
and how hard_; the game decides whether that is a splash, a plasma sheath or nothing.

**Design rule inherited from `b3d-death`:** cosmetics must not block the transition. If
the whiteout throws, the medium change still happens. That failure has already been made
once here, when charring a wreck threw and left the player welded to it.

## 7. Sequencing

1. **Optics on `Medium`** + one `fogLayerFor` derivation — consolidates three hand-rolled
   contributions and makes §4–§6 cheap. Do this before the look work in #15/#16, or those
   land as a fourth hand-rolled copy.
2. **Sky as medium appearance** (§5) — small, and it validates the abstraction.
3. **Shafts** (§4) — the biggest visual payoff; wants a budget knob from day one.
4. **Transitions** (§6) — needs the crossing speed plumbed through, which is a one-line
   addition to `crossing`'s result.

## 8. What would falsify this

If the optical fields end up as a union of unrelated knobs that no two media share, the
generalisation is fake and these should stay separate components. The check is §7 step 1:
if `b3d-water`, `b3d-clouds` and `b3d-fog` cannot all be expressed by the same
`fogLayerFor`, stop and keep them apart.
