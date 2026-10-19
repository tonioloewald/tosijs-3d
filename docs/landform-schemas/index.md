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
