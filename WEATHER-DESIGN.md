# Weather — a field over place and time, and the light it makes

> Status: **design** (drafted 2026-09-26 for Tonio's review; board #255, #1084).
> What exists: one shared scene wind (`owner.wind`, #73), the pure province wind
> maths (`windAt`, `ProvinceWind`: summed like temperature), the province climate
> curves (`province-climate.ts`: water, temperature, volcanism), the cloud deck
> with one coverage dial, `b3d-clouds`, ambient particles, and the medium
> primitive with shafts staged but unbuilt (MEDIUM-DESIGN §4). Nothing composes
> them into "the weather here, now".

## The idea

Weather is not a component; it is a **question every component already asks**:
_what is the weather where I am, right now?_ The deck asks it for coverage, the
water for wind on its waves, the ambient system for whether to rain, the sun for
how much gets through, the audio for whether to rumble. Today each asks a
different thing (the scene's single wind, its own dial), so they cannot agree,
and a storm cannot exist because nothing has a place to put one.

So the whole design is one function and the rules for filling it:

```
weatherAt(x, z, t) → { wind, coverage, precipitation, temperature, storminess }
```

- **Base**: the scene's weather, what you get with nothing declared. Everything a
  scene does today is this base, so nothing changes until something is declared.
- **Provinces**: the CLIMATE layer PROVINCE-DESIGN left empty. A lee behind a
  ridge, a wet coast, a volcano fouling the air downwind. Same coordinates, same
  default falloff, same "any layer optional" as every other province layer.
- **Systems**: a front or a storm cell is **a province whose centre moves**. It
  drifts with the wind, grows and decays over a lifetime, and composes exactly
  like a static one. That is the one new idea here, and it is small: the
  province machinery already answers "how strongly does this act at (x, z)", and
  a system only makes `at` a function of `t`.

## Composition — per quantity, as province-climate already does

| quantity | rule | why |
| --- | --- | --- |
| `wind` | vector SUM (exists: `windAt`) | a lee subtracts, a gust adds |
| `temperature` | signed SUM (exists) | a cold front beside a warm coast cancels |
| `coverage` | SUM, clamped 0–1 | a storm cell thickens the sky; a clear province thins it |
| `precipitation` | MAX | two storms overlapping do not rain twice as hard |
| `storminess` | MAX | lightning rate; like volcanism, the worst one wins |

The same rules as `province-climate`, deliberately: two ways of combining
provinces would mean two answers at a boundary.

## Consumers read it AT THEIR POSITION

The change for each consumer is the same shape: stop reading the scene wind or
its own dial, read `weatherAt` where it is (its own dial stays as an override,
as `wind="own"` does today).

- **cloud deck**: coverage per region, not one dial, so a storm is a thick patch
  that drifts across the sky and its shadow drifts with it (the deck and its
  shadow already share one field, so this is one input).
- **water**: waves from the local wind; calm in a lee.
- **ambient**: rain and snow come from `precipitation` (and `temperature`), blown
  by the local wind; leaves too.
- **sun**: dimmed by the coverage overhead, so a storm darkens the ground under
  it, not the whole world.
- **audio**: wind strength, rain, thunder.

## The weather's LIGHT: lightning and shafts are one subsystem

Tonio (#198): _"light shafts are almost a form of weather. The same thing that
makes lightning could be handling light shafts."_ Both are **light doing
something inside the volume** the weather defines:

- **Shafts** (MEDIUM-DESIGN §4): the sun through gaps in the cloud cover; under
  water, beams from the surface. Where the coverage field has holes is exactly
  where shafts go, so they are placed by the same field the deck renders.
- **Lightning**: an EVENT, sampled from `storminess` under a system, seeded. Its
  light has three parts, the last of which is the shaft machinery again:
  - a **flash**: a brief light in the scene, and the deck lit from INSIDE at the
    strike (a local emissive boost in the cloud field; the deck is the thing
    that makes storm light look like storm light);
  - a **bolt**: a ribbon, drawn and gone in a few frames;
  - **thunder**: delayed by distance at 343 m/s, which is also how a player
    reads how far away the storm is.

One subsystem with two triggers (the sun, continuously; a strike, briefly),
placed by the weather field, budgeted like ambient garnish: a device that cannot
afford shafts switches them OFF rather than thinning them into a lie.

## Determinism and the sim

Systems and strikes are seeded, so the same seed gives the same storms, as
`b3d-spawner` gives the same battles. The world simulation stays narrative-blind:
weather is state the sim can read (`weatherAt` is pure), and a strike that hits
something is an event with a position, which gameplay may react to. A driver
(Ariosto) may ASK for weather (an intent), never assume it.

## Staging: each step a watchable behaviour

1. **`weatherAt` + province wind wired.** Consumers read wind at their position.
   Watch: leaves and waves go calm in the lee of a ridge, and blow past it.
2. **A storm system.** A moving province with coverage, wind and rain, drifting
   across Land and Sky. Watch: a dark cell crossing the valley, its shadow and
   its rain moving with it, sunlight on either side.
3. **Lightning** in storm cells: flash lighting the deck from within, the bolt,
   delayed thunder. Watch: count the seconds.
4. **Shafts** (#1084): through gaps in the deck, and under water from the
   surface; one mechanism, with a budget knob from day one.
5. **Precipitation** as its own look (streaks aligned with wind), if ambient's
   first cut does not already carry it.

## Open questions (for Tonio)

1. **Where does a system live?** A `<tosi-b3d-weather>` element holding the base
   and spawning systems (seeded, like the spawner), or systems as ordinary
   provinces the author places, some with a velocity? The first is a "weather
   generator"; the second is "authored weather". Probably both, the generator
   being a spawner of the second.
2. **Is `weatherAt` a scene service** (`owner.weatherAt(x, z)`) or a pure
   function consumers call with the scene's declared inputs? The pure form is
   testable and Ariosto-readable; the service form is what components want.
   Likely the service, backed by the pure function, as `windAt` is.
3. **How much should a storm DO?** Visibility, turbulence for aircraft, water
   state for boats, footing for bipeds. This is where weather becomes behaviour
   rather than scenery, which is the north star, and it wants picking one first.
