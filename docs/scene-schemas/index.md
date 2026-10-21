# Scene schemas

**JSON Schema for the scene primitives, so a consumer never hand-copies our
attributes.** No DOM, no Babylon — importable from a headless runner.

## Why this exists

A consumer that generates property panels from JSON Schema would otherwise write
one per component by hand: a copy of our attributes, maintained in another
repository, against a component it does not own. A copy like that drifts in both
directions — attributes that were never copied, defaults that disagree — and
nothing anywhere fails.

`lightSettingsSchema` does the same for a lamp: mark one field and the whole
lamp appears, with no schema on the consumer's side to maintain. This is that,
for the rest of the scene.

## These carry NO `x-widget`

Deliberately, and it is the one thing to get right. A widget token says "hand
this whole value to a custom editor" — correct for a light program, wrong here,
because a consumer's generated panel already renders numbers, colours, booleans
and enums perfectly well. Adding a token would point at an editor that does not
exist and break the panel that works.

What these DO carry is everything `initAttributes` cannot say: ranges, units,
enum members, colour formats, and which sliders want a log scale.

## `format`, not `x-widget`, is what a control keys off

`format: 'color'` is JSON Schema's own spelling, and it stays the one to read.
The dispatch a consumer wants is:

```javascript
// property.format === 'color'  →  a field that knows it holds a colour
ui.inputField({ value: current, type: 'color', handleChange })
// or the full picker
color3d({ value: current, handleChange })
```

`FieldType` has `'color'` for exactly this, so the two vocabularies line up:
a schema says `format`, a field says `type`, and neither has to guess. `x-widget`
stays reserved for values JSON Schema has no word for at all — a light program,
a curve — where the answer really is "hand the whole thing to a custom editor".

## The host has one too: `sceneSchemas.b3d`

`<tosi-b3d>` itself carries scene-level settings: the clear colour, glow, the
ambient occlusion look (`ssaoStrength`, `ssaoRadius`), the scene wind and the
time scale. `b3dSchema()` describes those and ONLY those. The host's other
attributes configure a viewer rather than a scene (camera limits, quality
tier, pixel ratio, gamepad and panel chrome, XR and pause behaviour) and are
declined by name in `SCENE_OMITTED.b3d`, so a document never stores someone's
laptop.

## Drift is a test, not a promise

The defaults here are duplicated from the components — there is no way to read
them without importing Babylon, which is exactly what makes this module usable.
So `scene-schemas.test.ts` imports the real components and fails if an attribute
is missing, extra, or disagrees on its default. The copy is allowed to exist
because it cannot silently rot.
