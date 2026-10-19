/*#
# landform schemas

The options of each authored landform (`volcano`, `impactCrater`, `pad`,
`gulley`, `cover`) as JSON Schema, for a host that builds its editors from
schemas or keeps landforms in its own documents (asked for by ensemble,
tosijs-3d#119). No DOM, no Babylon: import `tosijs-3d/landform-schemas`
headlessly.

```javascript
import { landformSchemas } from 'tosijs-3d'
const s = landformSchemas.volcano()
s.properties.craterRadius['x-derived'] // { from: 'radius', scale: 0.22 }
```

Three conventions beyond plain JSON Schema:

- **`x-position: true`** marks `x` and `z`. They are where the piece is, so a
  host that places pieces in a scene takes them from the piece's position and
  need not show them as fields.
- **`x-derived: { from, scale }`** marks a default that is worked out from
  another option (a volcano's crater is `radius × 0.22` unless you say
  otherwise). Such a field has NO `default`, because freezing the number would
  stop it following its source: leave it out of the options and the landform
  derives it.
- **`x-unit`** and **`x-scale: 'log'`**, as in the scene schemas.

Each schema's `properties` is typed against the factory's options interface,
so an option added to `VolcanoOptions` and not here fails the typecheck, and
`landform-schemas.test.ts` checks that filling every default in by hand draws
the same ground as leaving them out.
*/
/*{ "parent": "landform", "order": 10 }*/

import type {
  VolcanoOptions,
  CraterOptions,
  PadOptions,
  GulleyOptions,
  CoverOptions,
} from './landform.js'

type Prop = Record<string, unknown>

const M = { 'x-unit': 'm' }
const DEG = { 'x-unit': 'deg' }

const num = (def: number, extra: Prop = {}): Prop => ({
  type: 'number',
  default: def,
  ...extra,
})

/** A default worked out from another option: no frozen `default`. */
const derived = (from: string, scale: number, extra: Prop = {}): Prop => ({
  type: 'number',
  'x-derived': { from, scale },
  description: `Default ${from} × ${scale}.`,
  ...extra,
})

const position = (): Prop => num(0, { ...M, 'x-position': true })

const schema = <T>(
  title: string,
  description: string,
  properties: Record<keyof T, Prop>,
  required: Array<keyof T>,
  extra: Prop
): Prop => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  title,
  description,
  properties,
  required,
  additionalProperties: false,
  ...extra,
})

export function volcanoSchema(extra: Prop = {}): Prop {
  return schema<VolcanoOptions>(
    'Volcano',
    'A volcano forced through the terrain noise, with its province and, when active, a vent effect.',
    {
      x: position(),
      z: position(),
      radius: num(420, {
        ...M,
        minimum: 1,
        'x-scale': 'log',
        description: 'Footprint radius; outside it the terrain is untouched.',
      }),
      height: num(260, {
        ...M,
        minimum: 0,
        description: 'Edifice height above baseLevel.',
      }),
      baseLevel: num(0, {
        ...M,
        description: 'The level the cone rises from (the flanks blend toward it).',
      }),
      craterRadius: derived('radius', 0.22, { ...M, minimum: 0 }),
      craterDepth: derived('height', 0.35, { ...M, minimum: 0 }),
      flatten: num(0.7, {
        minimum: 0,
        maximum: 1,
        description: 'How much the flanks suppress the underlying noise.',
      }),
      glow: num(1, {
        minimum: 0,
        maximum: 1,
        description: 'Province intensity at the vent.',
      }),
      activity: num(0, {
        minimum: 0,
        maximum: 1,
        description: "The vent's effect: 0 extinct (no effect), 0.15 dormant, 0.5 semi-active, 1 erupting.",
        'x-stops': [
          { value: 0, label: 'extinct' },
          { value: 0.15, label: 'dormant' },
          { value: 0.5, label: 'semi-active' },
          { value: 1, label: 'erupting' },
        ],
      }),
    },
    ['x', 'z', 'radius', 'height'],
    extra
  )
}

export function impactCraterSchema(extra: Prop = {}): Prop {
  return schema<CraterOptions>(
    'Impact crater',
    'A bowl sunk into the existing terrain, a raised rim and a hot floor.',
    {
      x: position(),
      z: position(),
      radius: num(60, { ...M, minimum: 0.1, 'x-scale': 'log' }),
      depth: num(15, { ...M, minimum: 0, description: 'Bowl depth below the original terrain.' }),
      rimHeight: derived('depth', 0.3, { ...M, minimum: 0 }),
      glow: num(0.8, {
        minimum: 0,
        maximum: 1,
        description: 'Floor glow: about 0.5 is cooling ember veins, 1 a molten floor.',
      }),
    },
    ['x', 'z', 'radius', 'depth'],
    extra
  )
}

export function padSchema(extra: Prop = {}): Prop {
  return schema<PadOptions>(
    'Pad',
    'Dead-flat ground for a city or base, with a cut-and-fill skirt into the terrain.',
    {
      x: position(),
      z: position(),
      radius: num(30, { ...M, minimum: 0.1, description: 'Radius of the flat interior.' }),
      level: num(0, { ...M, description: 'Surface height (absolute).' }),
      blend: derived('radius', 0.5, { ...M, minimum: 0, description: 'Width of the skirt outside the flat interior. Default radius × 0.5.' }),
    },
    ['x', 'z', 'radius', 'level'],
    extra
  )
}

export function gulleySchema(extra: Prop = {}): Prop {
  return schema<GulleyOptions>(
    'Gulley',
    'A forced channel ending in a cliff: a predictable face for a tunnel mouth.',
    {
      x: position(),
      z: position(),
      heading: num(0, {
        ...DEG,
        minimum: -180,
        maximum: 180,
        description: 'Direction the gulley runs out from the face (0 = +x, 90 = +z).',
      }),
      width: num(12, { ...M, minimum: 0.1, description: 'Floor width.' }),
      length: num(80, { ...M, minimum: 0.1 }),
      floorY: num(0, { ...M, description: 'Floor height at the face (absolute).' }),
      cliffHeight: num(45, { ...M, minimum: 0, description: 'Cliff height above the floor.' }),
      faceRun: num(18, { ...M, minimum: 0.001, description: 'Distance over which the cliff rises: small is near-vertical.' }),
      grade: num(0, { description: 'Floor grade going outward (m per m).' }),
      fade: num(0.35, { minimum: 0.05, maximum: 0.9, description: 'Fraction of length spent fading back to the terrain.' }),
      wallFade: derived('width', 0.6, { ...M, minimum: 0.001 }),
      crestFade: derived('faceRun', 3, { ...M, minimum: 0.001 }),
    },
    ['x', 'z', 'heading', 'width', 'length', 'floorY'],
    extra
  )
}

export function coverSchema(extra: Prop = {}): Prop {
  return schema<CoverOptions>(
    'Cover',
    'Ground forced high enough over a corridor to keep a tunnel buried.',
    {
      x: position(),
      z: position(),
      heading: num(0, {
        ...DEG,
        minimum: -180,
        maximum: 180,
        description: 'Direction the corridor runs (0 = +x, 90 = +z).',
      }),
      width: num(12, { ...M, minimum: 0.1 }),
      length: num(200, { ...M, minimum: 0.1 }),
      minHeight: num(20, { ...M, description: 'The ground is at least this high over the corridor.' }),
      fade: derived('width', 0.7, { ...M, minimum: 0.001 }),
    },
    ['x', 'z', 'heading', 'width', 'length', 'minHeight'],
    extra
  )
}

/** Every authored landform's options, keyed by the factory's name. */
export const landformSchemas = {
  volcano: volcanoSchema,
  impactCrater: impactCraterSchema,
  pad: padSchema,
  gulley: gulleySchema,
  cover: coverSchema,
}

/**
 * Fill in an option the schema marks `x-derived` from its source, the way the
 * factory would. Handy for showing the number a derived field will take.
 */
export function landformDerived(
  schema: Prop,
  key: string,
  options: Record<string, number>
): number | undefined {
  const spec = (schema.properties as Record<string, Prop>)[key]
  const d = spec?.['x-derived'] as { from: string; scale: number } | undefined
  if (d == null) return undefined
  const src = options[d.from] ?? ((schema.properties as any)[d.from]?.default as number)
  return src == null ? undefined : src * d.scale
}
