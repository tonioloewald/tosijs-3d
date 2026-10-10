/*#
# Scene schemas

**JSON Schema for the scene primitives, so a consumer never hand-copies our
attributes.** No DOM, no Babylon — importable from a headless runner.

## Why this exists

`tosijs-3d-ensemble` generates its property panels from JSON Schema, and wrote
one for `b3d-skybox` by hand: a copy of our attributes, maintained in another
repository, against a component they do not own. It drifted in both directions
within one release — their schema exposed **6 of 16** attributes (the other ten
were never hidden deliberately, just not copied), and their `applyFog` defaulted
`true` where ours defaults `false`. Same name, same component, opposite
behaviour, and nothing anywhere failed.

`lightSettingsSchema` had already shown the alternative: mark one field and the
whole lamp appears, with no schema on their side to maintain. This is that,
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

`FieldType` gained `'color'` for exactly this, so the two vocabularies line up:
a schema says `format`, a field says `type`, and neither has to guess. `x-widget`
stays reserved for values JSON Schema has no word for at all — a light program,
a curve — where the answer really is "hand the whole thing to a custom editor".

Asked by `tosijs-3d-ensemble` (#72), whose generated panel had eight colour
properties it could not render and had to fall back to unvalidated hex text.

## The host has one too: `sceneSchemas.b3d`

`<tosi-b3d>` itself carries scene-level settings: the clear colour, glow, the
ambient occlusion look (`ssaoStrength`, `ssaoRadius`), the scene wind and the
time scale. `b3dSchema()` describes those and ONLY those. The host's other
attributes configure a viewer rather than a scene (camera limits, quality
tier, pixel ratio, gamepad and panel chrome, XR and pause behaviour) and are
declined by name in `SCENE_OMITTED.b3d`, so a document never stores someone's
laptop. Asked by `tosijs-3d-ensemble` (#101).

## Drift is a test, not a promise

The defaults here are duplicated from the components — there is no way to read
them without importing Babylon, which is exactly what makes this module usable.
So `scene-schemas.test.ts` imports the real components and fails if an attribute
is missing, extra, or disagrees on its default. The copy is allowed to exist
because it cannot silently rot.
*/
/*{ "parent": "core", "order": 80 }*/

/** A number with a range and, where it helps, a unit and a scale hint. */
const num = (
  def: number,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({ type: 'number', default: def, ...extra })

const color = (def: string): Record<string, unknown> => ({
  type: 'string',
  default: def,
  format: 'color',
})

const bool = (def: boolean): Record<string, unknown> => ({
  type: 'boolean',
  default: def,
})

/**
 * A string that is FETCHED — a URL (relative or absolute), or a base a
 * consumer's loader appends to. `format: 'uri-reference'` is standard JSON
 * Schema, so a validator can check every fetched field generically, including
 * ones a later version adds (tosijs-3d#91). Empty means "none".
 *
 * Where the field also takes KEYWORDS (`ground.texture: 'checker'`), they are
 * listed in `x-keywords`: a keyword is not a URL, and a consumer applying an
 * https rule must let those through.
 */
const url = (keywords?: string[]): Record<string, unknown> => ({
  type: 'string',
  default: '',
  format: 'uri-reference',
  ...(keywords ? { 'x-keywords': keywords } : {}),
})

/** A NUMBER that takes only these values (texture sizes and the like). */
const choice2 = (def: number, values: number[]): Record<string, unknown> => ({
  type: 'number',
  default: def,
  enum: values,
})

const choice = (def: string, values: string[]): Record<string, unknown> => ({
  type: 'string',
  default: def,
  enum: values,
})

/** Degrees, minutes, metres — the units a panel should show beside a number. */
const DEG = { 'x-unit': 'deg' }
const M = { 'x-unit': 'm' }
const MS = { 'x-unit': 'ms' }
/**
 * Spatial FREQUENCY — cycles per metre, so the feature size is `1 / value`.
 *
 * The single most misleading name in this file: a thing called "scale" that
 * gets SMALLER as features get BIGGER. Tonio: _"it's not at all obvious when a
 * scale is actually a frequency and where the useful values are."_ A consumer
 * reading only the schema has no way to know, puts a linear 0..1 slider on it,
 * and every useful value lands in the first three pixels.
 *
 * `x-wavelength` says the reciprocal is the number a person thinks in, so a
 * panel can show "≈67 m features" beside a value of 0.015.
 */
const FREQ = { 'x-unit': '1/m', 'x-scale': 'log', 'x-wavelength': true }

/*
`x-useful: [lo, hi]` marks where the values anybody wants live, inside a wider
legal range. It renders as `slider3d({ useful: [lo, hi] })` — a soft band on the
track, not a narrowed `min`/`max` (tosijs-3d#83).
*/

const schema = (
  title: string,
  properties: Record<string, unknown>,
  extra: Record<string, unknown>
) => ({ type: 'object', title, properties, ...extra })

/*
`x-sections: [{ title, icon, keys }]` — how the element's properties GROUP, in
order (tosijs-3d#98). Knowledge about the element, so it lives here rather
than in each demo: a panel builder emits a collapsible `label3d({ text: title,
icon, collapsible: true })` before each section's rows, and `foldSections`
(or a `<tosi-b3d panelSections="tabs">`) does the rest. Keys a section does
not list fall at the end. `scene-schemas.test.ts` checks every key exists and
none appears twice.
*/
type Section = { title: string; icon?: string; keys: string[] }
const sections = (list: Section[]) => ({ 'x-sections': list })

/**
 * `b3d-skybox` — the procedural sky and its day/night cycle.
 *
 * `realtimeScale` gets a log scale WITH a zero stop: 0 is a still sky and the
 * default, 1 is realtime, 3600 is an hour a second. On a linear track every
 * value anyone wants sits in the first thousandth of the travel, and a plain
 * log track cannot reach the default at all.
 */
export function skyboxSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Sky',
    {
      timeOfDay: num(6.5, { minimum: 0, maximum: 24, 'x-unit': 'h' }),
      realtimeScale: num(10, {
        minimum: 0,
        maximum: 3600,
        'x-scale': 'log',
        'x-zero-stop': true,
      }),
      latitude: num(40, { minimum: -90, maximum: 90, ...DEG }),
      turbidity: num(10, { minimum: 1, maximum: 40 }),
      luminance: num(1, { minimum: 0, maximum: 2 }),
      rayleigh: num(2, { minimum: 0, maximum: 4 }),
      // Leaving the atmosphere. Metres, and a BAND: the pair is literally
      // `band(altitude, startAt, full)` from atmosphere.ts. Off while
      // `spaceFull <= spaceStart`, which is why both default to 0 — there is no
      // honest default altitude (the Kármán line is 100 km and no demo climbs
      // it), so the scene that wants the effect states its own dramatic scale.
      spaceStart: num(0, { minimum: 0, maximum: 200000, ...M }),
      spaceFull: num(0, { minimum: 0, maximum: 200000, ...M }),
      // The WORLD's air (1 Earth, 0 the Moon); multiplies with the band.
      atmosphere: num(1, { minimum: 0, maximum: 1 }),
      // Dust: bright coloured haze, never blue — Mars is little air, much dust.
      dust: num(0, { minimum: 0, maximum: 1 }),
      zenithTint: color('#ffffff'),
      horizonTint: color('#ffffff'),
      tintStrength: num(0, { minimum: 0, maximum: 1 }),
      starfield: num(0, { minimum: 0, maximum: 20000 }),
      nebulae: num(0, { minimum: 0, maximum: 200 }),
      nebulaBrightness: num(1, { minimum: 0, maximum: 3 }),
      nebulaSize: num(0.045, { minimum: 0.02, maximum: 1 }),
      spaceColor: color('#05070f'),
      nebulaTexture: url(),
      starfieldCube: url(),
      // A DATA cube, not a picture — see starfield-codec. The three numbers
      // below describe how to decode it and must match what encoded it.
      starfieldData: url(),
      starfieldDataSize: num(1024, { minimum: 8, maximum: 4096 }),
      starfieldSharpness: num(3, { minimum: 0.1, maximum: 8 }),
      starfieldGain: num(0.9, { minimum: 0, maximum: 3 }),
      starfieldFloor: num(0.4, { minimum: 0, maximum: 1 }),
      starfieldTwinkle: num(0.35, { minimum: 0, maximum: 1 }),
      starfieldSizeScale: num(3, { minimum: 1, maximum: 12 }),
      starfieldTilt: { type: 'string', default: '0,0,0' },
      starfieldSeed: num(12345, { minimum: 0, maximum: 999999 }),
      starDistance: num(0, { minimum: 0, maximum: 100000, ...M }),
      mieCoefficient: num(0.005, { minimum: 0, maximum: 0.05 }),
      mieDirectionalG: num(0.8, { minimum: 0, maximum: 1 }),
      sunColor: color('#eeeeff'),
      duskColor: color('#ffaa22'),
      moonColor: color('#6688cc'),
      moonIntensity: num(0.15, { minimum: 0, maximum: 1 }),
      // 1/distance from the star: Venus 1.39, Mars 0.66, Io 0.19, Titan 0.11.
      sunSize: num(1, { minimum: 0.02, maximum: 5 }),
      sunBrightness: num(1, { minimum: 0, maximum: 3 }),
      skyboxSize: num(1000, {
        minimum: 100,
        maximum: 20000,
        ...M,
        'x-scale': 'log',
      }),
      updateFrequencyMs: num(100, { minimum: 16, maximum: 2000, ...MS }),
      applyFog: bool(false),
    },
    {
      ...sections([
        {
          title: 'Sky',
          icon: 'sky',
          keys: [
            'timeOfDay',
            'realtimeScale',
            'latitude',
            'turbidity',
            'luminance',
            'rayleigh',
            'mieCoefficient',
            'mieDirectionalG',
            'atmosphere',
            'dust',
          ],
        },
        {
          title: 'Tint',
          icon: 'sky',
          keys: ['zenithTint', 'horizonTint', 'tintStrength'],
        },
        {
          title: 'Sun & moon',
          icon: 'sun',
          keys: [
            'sunColor',
            'duskColor',
            'sunSize',
            'sunBrightness',
            'moonColor',
            'moonIntensity',
          ],
        },
        {
          title: 'Stars',
          icon: 'star',
          keys: [
            'starfield',
            'nebulae',
            'nebulaBrightness',
            'nebulaSize',
            'starfieldGain',
            'starfieldFloor',
            'starfieldTwinkle',
            'starfieldSeed',
            'starDistance',
            'starfieldTilt',
          ],
        },
        {
          title: 'Space',
          icon: 'earth',
          keys: ['spaceStart', 'spaceFull', 'spaceColor'],
        },
        {
          title: 'Assets',
          icon: 'downloadCloud',
          keys: [
            'nebulaTexture',
            'starfieldCube',
            'starfieldData',
            'starfieldDataSize',
            'starfieldSharpness',
            'starfieldSizeScale',
          ],
        },
        {
          title: 'Advanced',
          icon: 'settings',
          keys: ['skyboxSize', 'updateFrequencyMs', 'applyFog'],
        },
      ]),
      ...extra,
    }
  )
}

/** `b3d-sun` — the directional light and its cascaded shadow maps. */
export function sunSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Sun',
    {
      intensity: num(1, { minimum: 0, maximum: 10 }),
      x: num(0, { minimum: -1, maximum: 1 }),
      y: num(-1, { minimum: -1, maximum: 1 }),
      z: num(-0.5, { minimum: -1, maximum: 1 }),
      shadowDarkness: num(0.1, { minimum: 0, maximum: 1 }),
      shadowMaxZ: num(100, {
        minimum: 1,
        maximum: 2000,
        ...M,
        'x-scale': 'log',
      }),
      activeDistance: num(30, { minimum: 1, maximum: 500, ...M }),
      // 0 is AUTO — resolved against the device tier, like every budget here.
      shadowTextureSize: num(0, {
        minimum: 0,
        maximum: 4096,
        'x-scale': 'log2',
        'x-snap': 1,
      }),
      numCascades: num(0, { minimum: 0, maximum: 4 }),
      stabilizeCascades: choice('on', ['on', 'off']),
      lambda: num(0.8, { minimum: 0, maximum: 1 }),
      cascadeBlendPercentage: num(0.1, { minimum: 0, maximum: 1 }),
      shadowNormalBias: num(0.02, { minimum: 0, maximum: 0.5 }),
      shadowBias: num(0.00005, { minimum: 0, maximum: 0.01 }),
      updateIntervalMs: num(1000, { minimum: 0, maximum: 10000, ...MS }),
    },
    extra
  )
}

/** `b3d-water` — the water surface, its waves, and the look from underneath. */
export function waterSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Water',
    {
      waterColor: color('#0066cc'),
      colorBlendFactor: num(0.1, { minimum: 0, maximum: 1 }),
      waveHeight: num(0, { minimum: 0, maximum: 2, ...M }),
      waveLength: num(0.1, { minimum: 0.01, maximum: 5 }),
      bumpHeight: num(0.1, { minimum: 0, maximum: 2 }),
      windForce: num(-5, { minimum: -50, maximum: 50 }),
      windDirectionX: num(0.6, { minimum: -1, maximum: 1 }),
      windDirectionY: num(0.8, { minimum: -1, maximum: 1 }),
      wind: choice('scene', ['scene', 'own']),
      underwaterFog: num(0.12, { minimum: 0, maximum: 1 }),
      fogColor: color('#00264d'),
      underwaterMurk: num(0.08, { minimum: 0, maximum: 1 }),
      fogTransition: num(0.2, { minimum: 0, maximum: 5, ...M }),
      // The WATER LEVEL, and the reason water's transform is exposed where the
      // sky's is not: `y` here is a scene fact an author sets deliberately.
      y: num(0, { ...M }),
      x: num(0, { ...M }),
      z: num(0, { ...M }),
      waterSize: num(128, { minimum: 1, maximum: 10000, ...M }),
      subdivisions: num(32, { minimum: 1, maximum: 256 }),
      textureSize: num(0, {
        minimum: 0,
        maximum: 4096,
        description:
          'Size of the reflection and refraction textures. 0 follows the device tier (1024 / 512 / 256).',
      }),
      shore: choice('off', ['on', 'off']),
      shoreFine: bool(false),
      receiveShadows: choice('on', ['on', 'off']),
      reflectionRefresh: num(0, {
        minimum: 0,
        maximum: 8,
        description:
          'Redraw the reflection and refraction every Nth frame. 0 follows the device tier (1 / 2 / 3); 1 is every frame.',
      }),
      normalMap: url(),
      twoSided: bool(false),
      // Snell's window from below; 'auto' = on whenever twoSided (board #197).
      underside: choice('auto', ['auto', 'on', 'off']),
      undersideColor: color('#9fdcf0'),
      undersideDepthColor: color('#06283a'),
      undersideSky: num(1, { minimum: 0, maximum: 2 }),
      // Light through the surface onto what is beneath (board #198).
      caustics: choice('auto', ['auto', 'on', 'off']),
      causticsStrength: num(0.6, { minimum: 0, maximum: 2 }),
      causticsScale: num(6, { minimum: 0.5, maximum: 50, ...M }),
      spherical: bool(false),
      follow: bool(false),
    },
    {
      ...sections([
        {
          title: 'Surface',
          icon: 'water',
          keys: [
            'waterColor',
            'colorBlendFactor',
            'waveHeight',
            'waveLength',
            'bumpHeight',
            'windForce',
            'windDirectionX',
            'windDirectionY',
            'wind',
          ],
        },
        {
          title: 'Under water',
          icon: 'fog',
          keys: [
            'underwaterFog',
            'fogColor',
            'underwaterMurk',
            'fogTransition',
            'underside',
            'undersideColor',
            'undersideDepthColor',
            'undersideSky',
            'caustics',
            'causticsStrength',
            'causticsScale',
          ],
        },
        {
          title: 'Placement',
          icon: 'settings',
          keys: [
            'y',
            'x',
            'z',
            'waterSize',
            'subdivisions',
            'textureSize',
            'reflectionRefresh',
            'normalMap',
            'twoSided',
            'spherical',
            'follow',
          ],
        },
      ]),
      ...extra,
    }
  )
}

/** `b3d-fog` — scene fog. `syncSkybox` ties its colour to the sky. */
export function fogSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Fog',
    {
      mode: choice('linear', ['linear', 'exp', 'exp2']),
      color: color('#bfd9f2'),
      start: num(60, { minimum: 0, maximum: 5000, ...M, 'x-scale': 'log' }),
      end: num(120, { minimum: 0, maximum: 10000, ...M, 'x-scale': 'log' }),
      density: num(0.01, {
        minimum: 0,
        maximum: 1,
        'x-scale': 'log',
        'x-zero-stop': true,
      }),
      syncSkybox: bool(false),
    },
    extra
  )
}

/** `b3d-clouds` — the opaque blob cloud layer you can fly into. */
export function cloudsSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Clouds',
    {
      coverage: num(0.5, { minimum: 0, maximum: 1 }),
      count: num(36, { minimum: 0, maximum: 500 }),
      altitude: num(140, { minimum: 0, maximum: 5000, ...M, 'x-scale': 'log' }),
      thickness: num(36, { minimum: 0, maximum: 1000, ...M, 'x-scale': 'log' }),
      spread: num(1200, { minimum: 1, maximum: 20000, ...M }),
      size: num(70, { minimum: 1, maximum: 1000, ...M }),
      color: color('#ffffff'),
      opacity: num(1, { minimum: 0, maximum: 1 }),
      selfIllum: num(0.35, { minimum: 0, maximum: 1 }),
      fogDensity: num(1.0, { minimum: 0, maximum: 5 }),
      approach: num(0.8, { minimum: 0, maximum: 1 }),
      castShadows: bool(false),
      shadowStrength: num(0.65, { minimum: 0, maximum: 1 }),
      windX: num(4, { minimum: -100, maximum: 100 }),
      windZ: num(1.5, { minimum: -100, maximum: 100 }),
      wind: choice('scene', ['scene', 'own']),
      seed: num(1, { minimum: 0 }),
      model: url(),
    },
    extra
  )
}

/**
 * `b3d-ambient` — device-budgeted garnish (motes, bubbles, leaves).
 *
 * `disabled` is the negative form on purpose: a boolean attribute cannot
 * default true, because an absent boolean reads false. Every on-by-default
 * switch in this library is either inverted like this or an `'on'|'off'` string.
 */
export function ambientSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Ambient',
    {
      preset: choice('motes', [
        'motes',
        'bubbles',
        'rain',
        'snow',
        'dust',
        'leaves',
      ]),
      where: choice('always', ['always', 'underwater', 'above']),
      // Driven by precipitation at the viewer (board #1124).
      weather: choice('off', ['off', 'rain', 'snow']),
      disabled: bool(false),
      radius: num(18, { minimum: 0, maximum: 500, ...M, 'x-scale': 'log' }),
      // 0 is AUTO for both — the device tier decides.
      count: num(0, { minimum: 0, maximum: 20000 }),
      minCount: num(0, { minimum: 0, maximum: 20000 }),
      rate: num(0, { minimum: 0 }),
      size: num(0, { minimum: 0 }),
      minTier: choice('low', ['low', 'medium', 'high']),
      priority: num(0, { minimum: 0, maximum: 100 }),
      lookAhead: num(0.35, { minimum: 0, maximum: 5 }),
      lead: num(0.25, { minimum: 0, maximum: 5 }),
      speedCap: num(40, { minimum: 0, maximum: 500 }),
      color: { type: 'string', default: '', format: 'color' },
      windX: num(0, { minimum: -100, maximum: 100 }),
      windZ: num(0, { minimum: -100, maximum: 100 }),
      wind: choice('scene', ['scene', 'own']),
    },
    extra
  )
}

/** `b3d-light` — the hemispheric ambient fill. Not a lamp; see `light-settings`. */
export function hemisphericLightSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Ambient light',
    {
      intensity: num(1, { minimum: 0, maximum: 4 }),
      diffuse: color('#ffffff'),
      specular: color('#808080'),
      // Bounce from below. Black is Babylon's default and is why an
      // ambient-only scene has vertical faces that stay dark however high
      // `intensity` goes — a dim, desaturated ground colour is the fix.
      groundColor: color('#000000'),
      x: num(0, { minimum: -1, maximum: 1 }),
      y: num(1, { minimum: -1, maximum: 1 }),
      z: num(0, { minimum: -1, maximum: 1 }),
    },
    extra
  )
}

/**
 * Attributes deliberately NOT exposed, and why.
 *
 * Every scene element extends `AbstractMesh`, which contributes a transform
 * (`x y z rx ry rz`) and an `axes` debug helper whether or not the element does
 * anything with them. Omitting silently is how ensemble's copy went wrong, so
 * omissions are listed and the drift test checks that anything missing from a
 * schema appears HERE — a forgotten attribute fails, a declined one does not.
 */
export const SCENE_OMITTED: Record<string, string[]> = {
  // The sky is centred on the viewer; a position for it is meaningless.
  // `azimuth` is DEAD (tosijs-3d#86): the sky material defines it as a no-op,
  // because the sun is placed by `latitude` and `timeOfDay`. Offering it would
  // be a slider that does nothing — which is exactly what shipped for two
  // releases, with the wrong unit besides.
  skybox: ['x', 'y', 'z', 'rx', 'ry', 'rz', 'axes', 'azimuth'],
  // A directional light has a DIRECTION (x/y/z, exposed above) and no place,
  // so there is nothing here to decline.
  sun: [],
  // `y` IS the water level and is exposed; the plane is horizontal by
  // definition, so its rotation is not something to offer.
  water: ['rx', 'ry', 'rz', 'axes'],
  fog: [],
  // The layer places itself by `altitude` and `spread` and carries no
  // transform of its own.
  clouds: [],
  // Garnish follows the camera; `radius` and `where` place it, and it has no
  // transform to decline.
  ambient: [],
  light: [],
  // A ground IS a placed mesh, so its transform is exposed; `axes` is a debug
  // helper, never content.
  ground: ['axes'],
  terrain: [],
  reflections: [],
  // The deck places itself by `altitude` and follows the camera; it has no
  // transform to decline.
  cloudDeck: [],
  moon: [],
  weatherCell: [],
  lightning: [],
  lightShafts: [],
  decorator: [],
  trail: [],
  sound: [],
  /*
  The host carries two kinds of attribute, and only one is the SCENE. These
  configure a VIEWER: the default camera's limits, the device (frame rate,
  quality tier, pixel ratio), input chrome (glass gamepad, panels), XR entry
  and pause behaviour. A document that stored them would be storing someone's
  laptop.
  */
  b3d: [
    'frameRate',
    'minElevation',
    'maxElevation',
    'minDistance',
    'maxDistance',
    'noXr',
    'xrGrid',
    'xrReticle',
    'scenePanelOpen',
    'panelSections',
    'gamepadScale',
    'gamepadFade',
    'quality',
    'pixelRatio',
    'stats',
    'pauseWhenHidden',
    'startPaused',
    'reseatFreeze',
    'enterXrOnResume',
  ],
}

/** `b3d-ground` — the simple ground plane. `size` of `0` means use width/height. */
export function groundSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Ground',
    {
      width: num(4, { minimum: 0, maximum: 10000, ...M, 'x-scale': 'log' }),
      height: num(4, { minimum: 0, maximum: 10000, ...M, 'x-scale': 'log' }),
      // 0 is "not square — use width and height", not "zero-sized".
      size: num(0, { minimum: 0, maximum: 10000, ...M, 'x-scale': 'log' }),
      color: color('#888888'),
      texture: url(['checker', 'noise']),
      textureTiles: num(8, { minimum: 1, maximum: 200, 'x-scale': 'log' }),
      x: num(0, { ...M }),
      y: num(0, { ...M }),
      z: num(0, { ...M }),
      rx: num(0, { minimum: -180, maximum: 180, ...DEG }),
      ry: num(0, { minimum: -180, maximum: 180, ...DEG }),
      rz: num(0, { minimum: -180, maximum: 180, ...DEG }),
      meshName: { type: 'string', default: 'ground' },
    },
    extra
  )
}

/**
 * `b3d-terrain` — the streaming LOD heightfield.
 *
 * The noise scales get `log`, because they span decades and a linear track puts
 * every useful value in its first few percent — the case that motivated log
 * sliders in the first place.
 */
export function terrainSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Terrain',
    {
      seed: num(12345, { minimum: 0 }),
      /*
      NO `plane`. It was in this list and the element has never implemented it —
      only `sphere` and `torus` branch, and everything else falls through to the
      cylinder path. So a consumer offering `plane` in a picker got a cylinder
      and no warning, which is the schema lying about the thing it exists to
      describe. Reported from tosijs-3d-ensemble, who exposed it because it was
      here (#66).

      What the type actually selects is how the 2D noise WRAPS, so the terrain
      tiles seamlessly around that surface:

      | surfaceType | wraps U over    | wraps V over      | reads          |
      | ----------- | --------------- | ----------------- | -------------- |
      | `cylinder`  | 2π·radius       | cylinderHeight    | radius, cylinderHeight |
      | `sphere`    | 2π·radius       | π·radius          | radius         |
      | `torus`     | 2π·majorRadius  | 2π·minorRadius    | majorRadius, minorRadius |

      Which answers the other half of #66: `radius` genuinely has no effect on a
      torus, and that is correct rather than a bug — a torus is parameterised by
      its major and minor radii, and `radius` is the sphere/cylinder one.
      */
      surfaceType: choice('cylinder', ['cylinder', 'torus', 'sphere']),
      grossScale: num(0.015, {
        minimum: 0.0001,
        maximum: 1,
        ...FREQ,
        title: 'Gross scale (frequency)',
        description:
          'Cycles per metre for the LANDFORM layer — the reciprocal is the ' +
          'feature size, so 0.015 is hills about 67 m across. Bigger number, ' +
          'smaller hills. Useful range is roughly 0.002–0.05.',
        'x-useful': [0.002, 0.05],
      }),
      detailScale: num(0.09, {
        minimum: 0.0001,
        maximum: 1,
        ...FREQ,
        title: 'Detail scale (frequency)',
        description:
          'Cycles per metre for the ROUGHNESS layer, on top of the landform. ' +
          'Wants to be several times `grossScale` or the two beat against ' +
          'each other. Useful range is roughly 0.03–0.3.',
        'x-useful': [0.03, 0.3],
      }),
      grossAmplitude: num(8, {
        minimum: 0,
        maximum: 500,
        ...M,
        description:
          'Height of the landform layer. Total relief is roughly ' +
          '`grossAmplitude + detailAmplitude`, which is what `center` halves ' +
          'to straddle y=0.',
      }),
      detailAmplitude: num(3, {
        minimum: 0,
        maximum: 200,
        ...M,
        description:
          'Height of the roughness layer. Comparable to `grossAmplitude` ' +
          'reads as noise rather than terrain; a third of it is a good start.',
      }),
      horizScale: num(1, { minimum: 0.01, maximum: 100, 'x-scale': 'log' }),
      baseHeight: num(0, { minimum: -1000, maximum: 1000, ...M }),
      normalSmoothing: num(0.6, { minimum: 0, maximum: 1 }),
      biome: choice('off', ['off', 'on']),
      biomeSeaLevel: num(0, { minimum: -1000, maximum: 1000, ...M }),
      biomeLapseRate: num(0, { minimum: 0, maximum: 1 }),
      // Temperature: 0 is 0 °C, a unit is 50 °C; no auto value. For the two
      // after it, -1 = the biome plugin's own default (0 is a real value).
      biomeTemperature: num(0.45, { minimum: -6, maximum: 10 }),
      biomeMoisture: num(-1, { minimum: -1, maximum: 1 }),
      biomeVolcanicScale: num(-1, { minimum: -1, maximum: 1 }),
      biomeSeason: num(0.25, { minimum: 0, maximum: 1 }),
      biomeSeasonality: num(0, { minimum: 0, maximum: 1 }),
      tileSize: num(10, { minimum: 1, maximum: 1000, ...M }),
      lodLevels: num(5, { minimum: 1, maximum: 12 }),
      splitFactor: num(2, { minimum: 2, maximum: 8 }),
      // 0 is AUTO on all of these — the device tier decides.
      hiResSubdivisions: num(0, { minimum: 0, maximum: 256 }),
      poolSize: num(0, { minimum: 0, maximum: 4096 }),
      fillBudget: num(0, { minimum: 0, maximum: 512 }),
      reach: num(0, {
        minimum: 0,
        maximum: 10000,
        ...M,
        description:
          'How far the terrain extends. 0 = auto from the coarsest tile. ' +
          'COUPLED TO `tileSize`: finest tiles go as (2·reach / tileSize)², ' +
          'so reach 5000 at tileSize 10 is a million of them. The element ' +
          'clamps to 256 tiles across and warns rather than dying — raise ' +
          '`tileSize` to reach further. A schema cannot express this pairing, ' +
          'which is why the element owns it.',
        'x-couples-with': 'tileSize',
        // A magnitude spanning four decades — and `0` is a SENTINEL (auto),
        // not a small value, which is exactly what `zeroStop` is for: give the
        // bottom of the track to zero instead of pretending log(0) exists.
        'x-scale': 'log',
        'x-zero-stop': true,
      }),
      tileBuildMs: num(0, { minimum: 0, maximum: 100, ...MS }),
      majorRadius: num(100, {
        minimum: 1,
        maximum: 100000,
        ...M,
        'x-scale': 'log',
      }),
      minorRadius: num(40, {
        minimum: 1,
        maximum: 100000,
        ...M,
        'x-scale': 'log',
      }),
      radius: num(200, {
        minimum: 1,
        maximum: 1000000,
        ...M,
        'x-scale': 'log',
      }),
      cylinderHeight: num(200, {
        minimum: 1,
        maximum: 100000,
        ...M,
        'x-scale': 'log',
      }),
      originResetThreshold: num(500, {
        minimum: 1,
        maximum: 100000,
        ...M,
        'x-scale': 'log',
      }),
      maxTravelDistance: num(5000, {
        minimum: 1,
        maximum: 1000000,
        ...M,
        'x-scale': 'log',
      }),
      center: bool(false),
      wireframe: bool(false),
      debugColor: bool(false),
      profile: bool(false),
    },
    extra
  )
}

/**
 * `b3d-reflections` — dynamic probes for `_mirror` meshes.
 *
 * Every knob here is a COST dial, which is why they all carry ranges: a probe
 * renders six faces, and `refreshRate` is how many frames it may skip between
 * doing so. See TODO's arbitration note before turning these up in content a
 * consumer inserts.
 */
export function reflectionsSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Reflections',
    {
      // 0 is AUTO — resolved against the device tier.
      probeSize: num(0, {
        minimum: 0,
        maximum: 2048,
        'x-scale': 'log2',
        'x-snap': 1,
      }),
      refreshRate: num(5, { minimum: 1, maximum: 120 }),
      farRefreshRate: num(30, { minimum: 1, maximum: 600 }),
      maxDistance: num(100, {
        minimum: 1,
        maximum: 10000,
        ...M,
        'x-scale': 'log',
      }),
      farDistance: num(30, {
        minimum: 1,
        maximum: 10000,
        ...M,
        'x-scale': 'log',
      }),
      distanceCheckInterval: num(13, { minimum: 1, maximum: 240 }),
    },
    extra
  )
}

/**
 * `b3d-cloud-deck` — the tiled cloud deck: one coverage dial, cirrus, wind,
 * orographic cloud and the shared cloud shadow (tosijs-3d#87).
 *
 * The ranges are the ones the element's own docs state; where they state none
 * (altitude, wind, the depths) they are generous working bounds, not limits
 * the element enforces.
 */
export function cloudDeckSchema(extra: Record<string, unknown> = {}) {
  const unit = { minimum: 0, maximum: 1 }
  return schema(
    'Cloud deck',
    {
      altitude: num(140, { minimum: 0, maximum: 12000, ...M }),
      size: num(14000, {
        minimum: 500,
        maximum: 100000,
        ...M,
        'x-scale': 'log',
      }),
      subdivisions: num(64, { minimum: 1, maximum: 256 }),
      // Clear 0 → solid 1 → THICKENING, up to 2.
      coverage: num(0.5, {
        minimum: 0,
        maximum: 2,
        description:
          '0 clear, 1 solid. PAST 1 is a different quantity: there is no sky left to cover, so the surplus thickens the cloud downward (a thunderhead), up to thickenDepth.',
      }),
      thickenDepth: num(900, { minimum: 0, maximum: 5000, ...M }),
      seed: num(1337, { minimum: 0 }),
      frequency: num(3, { minimum: 1, maximum: 16 }),
      // Rounded heaps 0 → streaks ALONG the wind at +1, ACROSS it at -1.
      cirrus: num(0, {
        minimum: -1,
        maximum: 1,
        description:
          'SIGNED: the magnitude is how wispy, the sign picks the axis. Positive streaks along the wind, negative across it, so -0.4 is perpendicular cirrus, not less of it.',
      }),
      wind: num(8, { minimum: 0, maximum: 60, 'x-unit': 'm/s' }),
      windHeadingDeg: num(0, { minimum: 0, maximum: 360, ...DEG }),
      evolve: num(0.5, unit),
      follow: choice('on', ['on', 'off']),
      localRise: num(1200, { minimum: 0, maximum: 5000, ...M }),
      // Storm towers from weather cells past coverage 1 (board #1122).
      stormRise: num(0, { minimum: 0, maximum: 5000, ...M }),
      localCoverage: num(1, { minimum: 0, maximum: 2 }),
      // Needs a terrain in the scene.
      orographic: num(0, unit),
      orographicPeak: num(260, { minimum: 1, maximum: 5000, ...M }),
      shadows: choice('on', ['on', 'off']),
      // 0 is AUTO — resolved against the device tier.
      shadowResolution: num(0, {
        minimum: 0,
        maximum: 2048,
        'x-scale': 'log2',
        'x-snap': 1,
      }),
      shadowRange: num(6000, {
        minimum: 500,
        maximum: 50000,
        ...M,
        'x-scale': 'log',
      }),
      ambientGloomBelow: num(0.7, unit),
      ambientGloom: num(0.45, unit),
      sunGloomBelow: num(0.25, unit),
      sunGloom: num(0.65, unit),
      shadowStrength: num(0.75, unit),
      // -1 is AUTO — derived from coverage.
      transmission: num(-1, { minimum: -1, maximum: 1 }),
      thickness: num(180, { minimum: 0, maximum: 2000, ...M }),
      haze: num(0.6, unit),
      octaves: num(6, { minimum: 1, maximum: 10 }),
      fieldSize: num(1024, {
        minimum: 16,
        maximum: 4096,
        'x-scale': 'log2',
      }),
      period: num(1800, {
        minimum: 100,
        maximum: 20000,
        ...M,
        'x-scale': 'log',
      }),
      edgeFade: num(0.45, unit),
      color: color('#ffffff'),
      underColor: color('#3a4350'),
      // ADDED to the lit edges, so it can exceed 1.
      fringe: num(0.9, { minimum: 0, maximum: 3 }),
      bump: num(34, { minimum: 0, maximum: 100 }),
      underBump: num(0.85, unit),
      shade: num(0.22, unit),
    },
    {
      ...sections([
        {
          title: 'Cover',
          icon: 'cloud',
          keys: [
            'coverage',
            'cirrus',
            'thickenDepth',
            'haze',
            'thickness',
            'transmission',
          ],
        },
        {
          title: 'Motion',
          icon: 'move',
          keys: ['wind', 'windHeadingDeg', 'evolve', 'follow'],
        },
        {
          title: 'Local weather',
          icon: 'terrain',
          keys: [
            'localRise',
            'stormRise',
            'localCoverage',
            'orographic',
            'orographicPeak',
          ],
        },
        {
          title: 'Light & shadow',
          icon: 'sun',
          keys: [
            'shadows',
            'shadowResolution',
            'shadowRange',
            'shadowStrength',
            'ambientGloomBelow',
            'ambientGloom',
            'sunGloomBelow',
            'sunGloom',
          ],
        },
        {
          title: 'Look',
          icon: 'sky',
          keys: ['color', 'underColor', 'fringe', 'bump', 'underBump', 'shade'],
        },
        {
          title: 'Placement',
          icon: 'settings',
          keys: [
            'altitude',
            'size',
            'subdivisions',
            'seed',
            'frequency',
            'octaves',
            'fieldSize',
            'period',
            'edgeFade',
          ],
        },
      ]),
      ...extra,
    }
  )
}

/**
 * `b3d-moon` — a cosmetic moon in the skybox (tosijs-3d#93). Its PHASE is
 * shaded from the real sun, so it is not a setting.
 */
export function moonSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Moon',
    {
      azimuth: num(0, { minimum: 0, maximum: 360, ...DEG }),
      elevation: num(20, { minimum: -90, maximum: 90, ...DEG }),
      // Angular size; the real moon is about half a degree.
      size: num(0.5, {
        minimum: 0.05,
        maximum: 20,
        'x-useful': [0.2, 6],
        ...DEG,
      }),
      color: color('#dddddd'),
      brightness: num(1, { minimum: 0, maximum: 3 }),
    },
    extra
  )
}

/**
 * `b3d-weather-cell` — a region whose weather differs (tosijs-3d#97). What it
 * ADDS at its centre, easing to nothing at the rim. Coverage past 1 closes the
 * sky over its inner part (a storm).
 */
export function weatherCellSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Weather cell',
    {
      x: num(0, M),
      z: num(0, M),
      radius: num(200, {
        minimum: 1,
        maximum: 20000,
        'x-useful': [100, 8000],
        'x-scale': 'log',
        ...M,
      }),
      windSpeed: num(0, {
        minimum: 0,
        maximum: 60,
        'x-useful': [0, 30],
        'x-unit': 'm/s',
      }),
      windBearingDeg: num(0, { minimum: 0, maximum: 360, ...DEG }),
      coverage: num(0, { minimum: -1, maximum: 2, 'x-useful': [0, 1.8] }),
      precipitation: num(0, { minimum: 0, maximum: 1 }),
      storminess: num(0, { minimum: 0, maximum: 1 }),
      temperature: num(0, { minimum: -40, maximum: 40, 'x-unit': 'degC' }),
      drift: choice('off', ['off', 'wind']),
      // 0 = permanent.
      lifetime: num(0, { minimum: 0, maximum: 3600, 'x-unit': 's' }),
      // Seconds to gather from nothing; 0 = at once.
      grow: num(0, {
        minimum: 0,
        maximum: 600,
        'x-useful': [0, 120],
        'x-unit': 's',
      }),
    },
    extra
  )
}

/** `b3d-lightning` — strikes under stormy weather cells (tosijs-3d#97). */
export function lightningSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Lightning',
    {
      seed: num(1, { minimum: 0, maximum: 9999, multipleOf: 1 }),
      bolts: choice('on', ['on', 'off']),
      sprites: choice('on', ['on', 'off']),
      thunder: choice('on', ['on', 'off']),
      volume: num(0.8, { minimum: 0, maximum: 1 }),
      groundLight: num(2.5, { minimum: 0, maximum: 10 }),
      darken: num(0.5, { minimum: 0, maximum: 1 }),
      shadows: choice('on', ['on', 'off']),
      shadowSize: choice2(1024, [256, 512, 1024, 2048]),
      shadowRange: num(600, { minimum: 10, maximum: 3000, ...M }),
      flashLight: choice('point', ['point', 'directional']),
      color: color('#dce4ff'),
      // A multiple of the natural rate (about 0.6 a second at storminess 1).
      rate: num(1, { minimum: 0, maximum: 6, 'x-useful': [0, 5] }),
      brightness: num(1, { minimum: 0, maximum: 3 }),
    },
    extra
  )
}

/** `b3d-light-shafts` — sun shafts under broken cloud and under water
 * (tosijs-3d#97). */
export function lightShaftsSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Light shafts',
    {
      count: num(14, { minimum: 0, maximum: 40, multipleOf: 1 }),
      radius: num(3000, { minimum: 100, maximum: 10000, ...M }),
      width: num(40, { minimum: 1, maximum: 400, 'x-useful': [5, 200], ...M }),
      spread: num(0, { minimum: 0, maximum: 0.2 }),
      strength: num(0.35, { minimum: 0, maximum: 1 }),
      rainBoost: num(0.5, { minimum: 0, maximum: 3 }),
      // Empty = the sun's own colour.
      color: color(''),
      underwater: choice('on', ['on', 'off']),
      underwaterCount: num(12, { minimum: 0, maximum: 60, multipleOf: 1 }),
    },
    extra
  )
}

/** `b3d-decorator` — rocks and trees on the terrain, by budget
 * (tosijs-3d#97). `url` is FETCHED. */
export function decoratorSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Decorator',
    {
      budget: num(2000, {
        minimum: 0,
        maximum: 20000,
        multipleOf: 1,
        'x-useful': [0, 20000],
      }),
      radius: num(900, {
        minimum: 50,
        maximum: 5000,
        'x-useful': [200, 3000],
        ...M,
      }),
      seed: num(1, { minimum: 0, maximum: 9999, multipleOf: 1 }),
      url: url(),
      scale: num(1, { minimum: 0.1, maximum: 10, 'x-scale': 'log' }),
      // -1 = each rule's own strength; 0 = auto size.
      clump: num(-1, { minimum: -1, maximum: 1 }),
      clumpSize: num(0, { minimum: 0, maximum: 1000, ...M }),
      follow: choice('on', ['on', 'off']),
      shadows: choice('off', ['on', 'off']),
      colliders: choice('on', ['on', 'off']),
      colliderRange: num(60, { minimum: 0, maximum: 500, ...M }),
      colliderPool: num(48, { minimum: 0, maximum: 500, multipleOf: 1 }),
      shadowRange: num(200, { minimum: 0, maximum: 2000, ...M }),
      shadowBudget: num(600, { minimum: 0, maximum: 5000, multipleOf: 1 }),
    },
    extra
  )
}

/** `b3d-trail` — a ribbon behind whatever it is nested in (tosijs-3d#97). */
export function trailSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Trail',
    {
      // Offset from what it is nested in.
      x: num(0, M),
      y: num(0, M),
      z: num(0, M),
      diameter: num(0.06, {
        minimum: 0.001,
        maximum: 10,
        'x-scale': 'log',
        ...M,
      }),
      length: num(45, { minimum: 1, maximum: 500, multipleOf: 1 }),
      color: color('#ffffff'),
      // Empty = the same colour under water.
      underwaterColor: color(''),
      alpha: num(0.16, { minimum: 0, maximum: 1 }),
      minSpeed: num(8, { minimum: 0, maximum: 100, 'x-unit': 'm/s' }),
    },
    extra
  )
}

/**
 * `b3d-sound` — positional audio (tosijs-3d#95). `url` is FETCHED, so it is a
 * `uri-reference` like every other fetched field, where a URL rule can see it.
 */
export function soundSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Sound',
    {
      url: url(),
      volume: num(1, { minimum: 0, maximum: 2 }),
      loop: bool(false),
      autoplay: bool(false),
      spatialSound: bool(false),
      x: num(0, M),
      y: num(0, M),
      z: num(0, M),
      refDistance: num(1, { minimum: 0, maximum: 1000, ...M }),
      rolloffFactor: num(1, { minimum: 0, maximum: 10 }),
      maxDistance: num(100, { minimum: 0, maximum: 10000, ...M }),
      distanceModel: choice('linear', ['linear', 'inverse', 'exponential']),
      // The name of a mesh to follow.
      attachTo: { type: 'string', default: '' },
      playbackRate: num(1, { minimum: 0.1, maximum: 4 }),
    },
    extra
  )
}

/** Every scene-primitive schema, by the element name a consumer would use. */
/**
 * `tosi-b3d` — the scene HOST's own attributes: the ones that say how the
 * scene looks and moves, as opposed to how one viewer is looking at it.
 *
 * Asked by `tosijs-3d-ensemble` (#101). A document can RECOMMEND an ambient
 * occlusion look (`ssaoStrength`, `ssaoRadius`) and carry the scene's wind, and
 * a consumer must never type those ranges itself.
 *
 * `ssao` is listed because the look is meaningless without it, but whether it
 * is ON is usually the viewer's call (it costs frame time and never runs in a
 * headset): store the recommendation, and let the device decide.
 */
export function b3dSchema(extra: Record<string, unknown> = {}) {
  return schema(
    'Scene',
    {
      clearColor: {
        ...color(''),
        description:
          'Background colour where nothing is drawn. Empty leaves the default; a skybox covers it.',
      },
      glowLayerIntensity: num(0, {
        minimum: 0,
        maximum: 3,
        'x-useful': [0, 1.5],
        description: 'Bloom around emissive surfaces. 0 is off.',
      }),
      ssao: {
        ...choice('off', ['off', 'auto', 'on', 'always']),
        'x-deprecated-values': ['always'],
        description:
          'Ambient occlusion. `auto` follows the device tier and never runs in a headset; `on` does, unless `ssaoMethod` is `screen`. `always` is deprecated and means `on`.',
      },
      ssaoMethod: {
        ...choice('projected', ['projected', 'screen']),
        description:
          '`projected` computes occlusion once from between the eyes and each material looks it up by world position, so `ssao="on"` also runs in a headset. `screen` is a post-process and flat only.',
      },
      ssaoRate: num(30, {
        minimum: 0,
        maximum: 120,
        'x-useful': [10, 60],
        'x-unit': 'Hz',
        description:
          'Projected only: how many times a second the occlusion is redrawn. 0 is every frame.',
      }),
      ssaoStrength: num(1, {
        minimum: 0,
        maximum: 3,
        'x-useful': [0.5, 2],
        description: 'How dark a fully occluded crease gets. 0 is none.',
      }),
      ssaoRadius: num(2, {
        minimum: 0.25,
        maximum: 6,
        'x-useful': [0.5, 3],
        ...M,
        description:
          'How far a surface looks for something occluding it. Small darkens tight creases; large shades whole alcoves.',
      }),
      xrRenderScale: num(0, {
        minimum: 0,
        maximum: 1,
        'x-useful': [0.5, 1],
        description:
          'In a headset: the fraction of each eye drawn, per axis. 0 is auto (from the device tier).',
      }),
      xrFoveation: num(-1, {
        minimum: -1,
        maximum: 1,
        'x-useful': [0, 1],
        description:
          'In a headset: fixed foveation, 0 to 1 (the edges of each eye at reduced resolution). -1 is auto (from the device tier).',
      }),
      groundDetail: {
        ...choice('auto', ['auto', 'full', 'lite']),
        description:
          'The ground shader: `full`, `lite` (fewer noise samples a pixel, for a weak GPU), or `auto` (from the device tier).',
      },
      timeScale: num(1, {
        minimum: 0,
        maximum: 8,
        'x-useful': [0, 2],
        description:
          'Sim time against wall time. 1 is real time, 0 stops the sim.',
      }),
      windSpeed: num(0, {
        minimum: 0,
        maximum: 60,
        'x-useful': [0, 30],
        'x-unit': 'm/s',
        description:
          "The scene wind. 0 is none; a child's own wind attributes still win where set.",
      }),
      windBearingDeg: num(0, {
        minimum: 0,
        maximum: 360,
        ...DEG,
        description:
          'Where the wind is GOING, north-up and clockwise. 0 blows toward +Z.',
      }),
      windGust: num(0, {
        minimum: 0,
        maximum: 1,
        description: 'Gust size as a fraction of windSpeed. 0 is dead steady.',
      }),
    },
    {
      ...sections([
        { title: 'Look', keys: ['clearColor', 'glowLayerIntensity'] },
        {
          title: 'Ambient occlusion',
          keys: [
            'ssao',
            'ssaoStrength',
            'ssaoRadius',
            'ssaoMethod',
            'ssaoRate',
          ],
        },
        { title: 'Headset', keys: ['xrRenderScale', 'xrFoveation'] },
        { title: 'Ground', keys: ['groundDetail'] },
        { title: 'Wind', keys: ['windSpeed', 'windBearingDeg', 'windGust'] },
        { title: 'Time', keys: ['timeScale'] },
      ]),
      ...extra,
    }
  )
}

export const sceneSchemas = {
  b3d: b3dSchema,
  skybox: skyboxSchema,
  sun: sunSchema,
  water: waterSchema,
  fog: fogSchema,
  clouds: cloudsSchema,
  ambient: ambientSchema,
  light: hemisphericLightSchema,
  ground: groundSchema,
  terrain: terrainSchema,
  reflections: reflectionsSchema,
  cloudDeck: cloudDeckSchema,
  moon: moonSchema,
  weatherCell: weatherCellSchema,
  lightning: lightningSchema,
  lightShafts: lightShaftsSchema,
  decorator: decoratorSchema,
  trail: trailSchema,
  sound: soundSchema,
} as const
