/*#
# terrainEditor3d

**An editor for a terrain, built FROM its schema.** Every range, log track,
unit and enum comes from `sceneSchemas.terrain()`, so the control cannot
disagree with the element it edits.

## Demo

Drag anything and the terrain rebuilds. The panel is the scene panel, so it is
the same editor flat and in a headset.

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

## Why schema-driven rather than hand-built

`tosijs-3d-ensemble` hand-wrote a terrain schema and reported it **wrong in
three separate ways in one day** (#66): `biome` declared a free string when it
is `'on' | 'off'`; every default sitting between 0% and 3% of its slider track
because the scales are frequencies; and `reach` unbounded into tab-death.

None of those are hard to get right with the source in front of you. All of
them are easy to get wrong from outside, and they drift again on the next
release. So this editor reads the same schema an adopter reads — if a range
changes in the element, the control changes with it, and nobody edits two
places.

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
- `surfaceType` becomes a select over the enum — which no longer offers `plane`,
  a value the element never implemented.

*/
/*{ "parent": "Environment", "order": 135 }*/
import { svgElements } from 'tosijs';
import { sceneSchemas } from './scene-schemas.js';
import { handlerOf } from './handler-of.js';
import { label3d, slider3d, select3d, toggle3d, } from './widgets3d.js';
const { g } = svgElements;
/*
THE FIELDS, GROUPED BY WHAT YOU ARE DOING.

Curation lives here and nowhere else — ranges, units, log tracks and enums all
come from the schema at build time. Adding a field is a line; changing what a
field MEANS is a change to the element, and this follows automatically.
*/
const SHAPE = [
    'grossScale',
    'detailScale',
    'grossAmplitude',
    'detailAmplitude',
    'horizScale',
    'baseHeight',
    'center',
    'seed',
];
const BIOME = ['biome', 'biomeSeaLevel', 'biomeLapseRate'];
const LOD = ['tileSize', 'lodLevels', 'reach', 'normalSmoothing'];
const SURFACE = [
    'surfaceType',
    'radius',
    'cylinderHeight',
    'majorRadius',
    'minorRadius',
];
/** Human labels where the attribute name alone would mislead. */
const LABEL = {
    grossScale: 'landform scale',
    detailScale: 'detail scale',
    grossAmplitude: 'landform height',
    detailAmplitude: 'detail height',
    horizScale: 'horizontal size',
    baseHeight: 'base height',
    biomeSeaLevel: 'sea level',
    biomeLapseRate: 'lapse rate',
    tileSize: 'tile size',
    lodLevels: 'LOD levels',
    normalSmoothing: 'normal smoothing',
    surfaceType: 'surface',
    cylinderHeight: 'cylinder height',
    majorRadius: 'major radius',
    minorRadius: 'minor radius',
};
export function terrainEditor3d(config = {}) {
    const props = sceneSchemas.terrain().properties;
    const s = { ...config.value };
    const el = g({ 'data-w3d': 'terrain-editor' });
    /** Row geometry from the last `layout` — see the note there. */
    const tops = [];
    const emit = (describe, commit) => {
        handlerOf(config, 'handleChange', 'onChange')?.({ ...s });
        if (commit)
            config.handleCommit?.({ ...s }, describe);
    };
    const current = (key) => s[key] ?? props[key]?.default;
    /** One control, its shape decided entirely by the schema entry. */
    const control = (key) => {
        const p = props[key];
        if (p == null)
            return null;
        const label = LABEL[key] ?? key;
        if (p.enum != null) {
            return select3d({
                label,
                value: String(current(key)),
                options: p.enum,
                handleChange: (v) => {
                    s[key] = v;
                    emit(label, true);
                },
            });
        }
        if (p.type === 'boolean') {
            return toggle3d({
                label,
                value: current(key) === true,
                handleChange: (v) => {
                    s[key] = v;
                    emit(label, true);
                },
            });
        }
        if (p.type !== 'number')
            return null;
        /*
        A LOG TRACK NEEDS A NON-ZERO FLOOR, and several of these legitimately reach
        zero (`baseHeight`, `grossAmplitude`). `x-zero-stop` says the zero is a
        SENTINEL rather than a small value — that is `reach`, whose 0 means "auto" —
        and only then is a log track with an explicit zero the right control.
        */
        const wantsLog = p['x-scale'] === 'log' || p['x-scale'] === 'log2';
        const zeroStop = p['x-zero-stop'] === true;
        const min = p.minimum ?? 0;
        const usable = wantsLog && (min > 0 || zeroStop);
        return slider3d({
            label,
            value: Number(current(key)) || 0,
            min: usable && min <= 0 ? 1e-4 : min,
            max: p.maximum ?? 100,
            scale: usable ? p['x-scale'] : 'linear',
            zeroStop: usable && zeroStop,
            snap: p['x-snap'],
            showValue: 'always',
            // The unit is the schema's, so a frequency reads as one.
            format: (v) => p['x-unit'] != null ? `${trim(v)} ${p['x-unit']}` : trim(v),
            handleChange: (v) => {
                s[key] = v;
                emit(label, true);
            },
        });
    };
    const group = (title, keys) => {
        const made = keys.map(control).filter((w) => w != null);
        return made.length > 0
            ? [label3d({ text: title, muted: true }), ...made]
            : [];
    };
    const rows = [
        ...group('shape', SHAPE),
        ...group('biome', BIOME),
        ...(config.advanced === true
            ? [...group('detail & tiles', LOD), ...group('surface', SURFACE)]
            : []),
    ];
    for (const r of rows)
        el.appendChild(r.el);
    const api = {
        el,
        get value() {
            return { ...s };
        },
        setValue(next) {
            // Skip undefined rather than storing it — a partial update should leave
            // the other fields alone, not blank them.
            for (const [k, v] of Object.entries(next)) {
                if (v !== undefined)
                    s[k] = v;
            }
        },
        layout(width) {
            /*
            REMEMBER the offsets rather than re-deriving them.
      
            `rowAt` and `setHost` used to call `r.layout(0)` just to read a height —
            which LAYS THE ROW OUT AGAIN at zero width, collapsing every slider track
            onto its label. It rendered a panel whose handles sat on the text, and no
            test saw it because the geometry is only wrong on screen.
            */
            tops.length = 0;
            let y = 0;
            for (const r of rows) {
                r.el.setAttribute('transform', `translate(0, ${y})`);
                tops.push({ w: r, top: y, height: r.layout(width) });
                y += tops[tops.length - 1].height;
            }
            return y;
        },
        hitTest(x, y) {
            const hit = rowAt(y);
            return hit?.w.hitTest?.(x, y - hit.top) ?? hit != null;
        },
        handle(kind, x, y) {
            const hit = rowAt(y);
            hit?.w.handle?.(kind, x, y - hit.top);
        },
        setHost(host) {
            // Forwarded with each row's own offset, or a popup opens at the top of
            // the editor rather than beside the control — the `offsetHost` lesson.
            // Offsets come from the last layout; asking for them re-lays-out.
            for (const { w, top } of tops) {
                w.setHost?.({
                    ...host,
                    showPopup: (cfg, ...items) => host.showPopup({ ...cfg, anchor: { ...cfg.anchor, y: cfg.anchor.y + top } }, ...items),
                });
            }
        },
    };
    /** Which row is at this y — from the last layout, never by re-laying out. */
    function rowAt(y) {
        return tops.find((t) => y >= t.top && y < t.top + t.height);
    }
    return api;
}
/** Short enough to read on a slider, without lying about small values. */
function trim(v) {
    if (v === 0)
        return '0';
    const abs = Math.abs(v);
    if (abs >= 100)
        return v.toFixed(0);
    if (abs >= 1)
        return v.toFixed(2).replace(/\.?0+$/, '');
    return String(Number(v.toPrecision(3)));
}
//# sourceMappingURL=terrain-editor.js.map