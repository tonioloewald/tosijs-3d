# terrainEditor3d

**An editor for a terrain, built FROM its schema.** Every range, log track,
unit and enum comes from `sceneSchemas.terrain()`, so the control cannot
disagree with the element it edits.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dLight, terrainEditor3d, label3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

let terrain = null

const editor = terrainEditor3d({
  value: { grossScale: 0.012, detailScale: 0.08, grossAmplitude: 40, detailAmplitude: 10 },
  handleChange: (s) => {
    if (terrain == null) return
    // Ordinary attribute writes. The element regenerates itself on change.
    for (const [k, v] of Object.entries(s)) terrain[k] = v
  },
})

terrain = b3dTerrain({
  grossScale: 0.012, detailScale: 0.08,
  grossAmplitude: 40, detailAmplitude: 10,
  // Coarsest tile is `tileSize · 2^(lodLevels-1)` = 1280, and the origin-reset
  // trigger is `max(originResetThreshold, coarsestTileSize)`. The orbit camera
  // below sits at 900, INSIDE that — park it further out and the terrain
  // resets its origin every frame and never fills a tile.
  tileSize: 80, lodLevels: 5,
})

preview.append(
  b3d(
    {
      style: 'width:100%;height:100%',
      scenePanelOpen: true,
      scenePanel: () => [label3d({ text: 'Terrain' }), editor],
      sceneCreated(el) {
        orbitCam(el, { alpha: -1.1, beta: 1.05, radius: 900, target: [0, 0, 0] })
      },
    },
    b3dSun({}),
    b3dSkybox({ timeOfDay: 10 }),
    b3dLight({ intensity: 0.35 }),
    terrain
  )
)
```
```css
.preview { height: 100%; }
```

Drag anything and the terrain rebuilds. The panel is the scene panel, so it is
the same editor flat and in a headset.

## Why schema-driven rather than hand-built

A hand-written schema goes wrong in quiet ways: `biome` declared a free string when
it is `'on' | 'off'`; every default sitting in the first 3% of its slider track
because the scales are frequencies; `reach` left unbounded. None of those are hard to
get right with the source in front of you, all are easy to get wrong from outside, and
they drift again on the next release. So this editor reads the same schema an adopter
reads: if a range changes in the element, the control changes with it, and nobody
edits two places.

## Curated, not generated

The schema carries **30** properties and most are performance internals
(`poolSize`, `fillBudget`, `tileBuildMs`, `splitFactor`). A panel showing all
thirty is not an editor, it is a settings dump — so the FIELD LIST is chosen
here and only the METADATA comes from the schema. Curation is a design decision;
ranges and units are facts.

`advanced: true` adds the LOD and surface-wrapping groups for someone tuning
performance or authoring a cylinder/sphere/torus world.

## What the metadata buys, concretely

- `grossScale`/`detailScale` get a **log** track with 4 significant digits,
  because they are frequencies in cycles/metre — on a linear track every useful
  value is in the first few pixels.
- `reach` gets log **and** a zero stop, because its `0` means "auto", not "very
  small".
- `surfaceType` becomes a select over the enum, which offers only the surfaces
  the element implements.
