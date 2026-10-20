/*#
# Effect tool

**Make an effect: particles, light and sound on one clock.** Start from a
preset (a volcano at any activity, a geyser, a splash, an explosion, a
fireball, sparks), change any layer and see it at once, then save the recipe
for `<tosi-b3d-effect>` to play in a game.

```js
import { effectTool } from 'tosijs-3d/effect-tool'

preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '600px')
preview.append(effectTool())
```

## Using it

Tap the scene once so the browser lets it make sound.

- **Effect**: the preset, `play` (a one-shot plays again), `stop`, the
  `activity` dial (a volcano: dormant, semi-active, erupting), `mute`, and
  `listen from`: how far away you are. Sound travels at 343 m/s, so at
  300 m an explosion's boom comes almost a second after its flash. `time of
  day` shows the lights at night.
- **Layers**: choose one and change it. Particles: how many, how long they
  live, how fast and big, gravity, wind, height, the first and last colour.
  `picture` swaps the sprite for your own image or SVG (embedded in the
  recipe, so a saved one carries it). A light: its colour, intensity, range
  and flicker. A sound: its voice,
  gain and pitch. Every layer: when it starts and how long it lasts.
- **Recipe**: `save` downloads the recipe as JSON, `load` reads one back,
  `copy` puts it on the clipboard, `start over` goes back to the preset. The
  working recipe is kept in this browser, per preset.

The element carries `.effect`: `recipe` (a copy; set one to play it) and
`player`, for a page or an editor driving the tool.

## In an editor: mounting it in your scene

`mountEffectTool(b3d, options)` opens the tool in a `<tosi-b3d>` you already
have, on the same contract as the rig tool's `mountRigTool` (tosijs-3d#122):

```javascript
import { mountEffectTool } from 'tosijs-3d/effect-tool'

const tool = mountEffectTool(scene, {
  recipe: piece.recipe,
  target: piece.node, // where it plays
  files: false, // the host keeps the recipe
  stage: false, // no ground or backdrop
  camera: editorCamera, // put back exactly on unmount
})
tool.addEventListener('commit', (e) => doc.record(e.detail.recipe))
tool.unmount()
```

`change` on every edit, `commit` once per finished gesture, each with a copy
of the recipe; hosted, its panel is a system panel; `unmount()` (safe twice)
returns the scene's counts to where they were, including the effect player's
shared driver and sprites, which now go with a scene's last player.
*/
/*{ "parent": "demos", "order": 36 }*/
import * as BABYLON from '@babylonjs/core';
import { b3d } from './tosi-b3d.js';
import { b3dLight } from './b3d-light.js';
import { b3dSkybox } from './b3d-skybox.js';
import { b3dPanel } from './b3d-panel.js';
import { GridMaterial } from '@babylonjs/materials';
import { button3d, label3d, panel3d, select3d, slider3d, toggle3d, } from './widgets3d.js';
import { color3d } from './color-field.js';
import { touchOrbit } from './touch-orbit.js';
import { EffectPlayer } from './effect-player.js';
import { EFFECT_PRESETS, effectPreset, VOLCANO_STATES, } from './effect-presets.js';
import { validateEffectRecipe, VOICES, soundDelay, } from './effect-recipe.js';
const STORE = 'tosijs-3d:effect-tool:';
const remember = (key, r) => {
    try {
        localStorage.setItem(STORE + key, JSON.stringify(r));
    }
    catch {
        /* the recipe is still in the page */
    }
};
const recall = (key) => {
    try {
        const s = localStorage.getItem(STORE + key);
        const r = s != null ? JSON.parse(s) : null;
        return r != null && validateEffectRecipe(r).length === 0 ? r : null;
    }
    catch {
        return null;
    }
};
const clone = (v) => JSON.parse(JSON.stringify(v));
function chooseFile(accept) {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
        input.addEventListener('cancel', () => resolve(null));
        input.click();
    });
}
/**
 * MOUNT THE EFFECT TOOL in an existing `<tosi-b3d>` (tosijs-3d#122), on the
 * same contract as `mountRigTool`: `change` per edit and `commit` per
 * finished gesture with a copy of the recipe, `files`, `stage`, a camera put
 * back on unmount, and a system panel when hosted.
 */
export function mountEffectTool(owner, options = {}) {
    const files = options.files !== false;
    const hosted = options.hosted !== false;
    const staged = options.stage !== false;
    const events = new EventTarget();
    let disposed = false;
    const cleanups = [];
    const ui = {
        preset: 'volcano',
        layer: 0,
        muted: false,
        distance: 40,
        timeOfDay: 18.5,
        backdrop: 'grid',
        status: '',
    };
    let recipe = options.recipe != null
        ? clone(options.recipe)
        : (files ? recall(ui.preset) : null) ?? effectPreset(ui.preset);
    if (options.recipe != null)
        ui.preset =
            recipe.name != null && EFFECT_PRESETS[recipe.name] != null
                ? recipe.name
                : 'custom';
    let player = null;
    let cam = null;
    // The panel: the scene's settings panel standalone, a system panel hosted.
    let panelEl = null;
    const panelSvg = () => {
        const svg = panel3d({ width: 300, height: 'fit', maxHeight: 640 }, ...panel());
        const inner = svg.handlePointer;
        if (inner != null)
            svg.handlePointer = (k, x, y) => {
                const r = inner(k, x, y);
                if (k === 'up')
                    commitNow();
                return r;
            };
        return svg;
    };
    const refresh = () => {
        if (disposed)
            return;
        if (!hosted)
            owner.refreshScenePanel?.();
        else if (panelEl != null)
            panelEl.svg = panelSvg();
    };
    // Change on every edit; one commit when a gesture ends (or edits pause).
    const emit = (type) => events.dispatchEvent(new CustomEvent(type, { detail: { recipe: clone(recipe) } }));
    let dirty = false;
    let idle = null;
    function commitNow() {
        if (idle != null)
            clearTimeout(idle);
        idle = null;
        if (!dirty || disposed)
            return;
        dirty = false;
        emit('commit');
    }
    function edited() {
        if (files)
            remember(ui.preset, recipe);
        dirty = true;
        emit('change');
        if (idle != null)
            clearTimeout(idle);
        idle = setTimeout(commitNow, 800);
    }
    /*
    A FIREBALL rides a projectile, so it has no height of its own: shown here
    it would sit half in the ground. Lifted for viewing only.
    */
    let here = null;
    const lift = () => {
        // A host's target is placed by the host.
        if (here != null && options.target == null)
            here.position.y = recipe.name === 'fireball' ? 1.5 : 0;
    };
    const sky = b3dSkybox({ timeOfDay: ui.timeOfDay });
    /*
    A NEUTRAL BACKDROP by default: a grey grid in metres under a grey sky, so
    an effect's own colours and size read as they are. A sunset tints every
    colour and gives nothing to measure against. The sky is one choice away.
    */
    let ground = null;
    let groundGrid = null;
    let groundPlain = null;
    const setBackdrop = (b) => {
        ui.backdrop = b;
        if (b === 'sky' && sky.parentElement == null)
            owner.append(sky);
        if (b === 'grid' && sky.parentElement != null)
            sky.remove();
        if (ground != null)
            ground.material = b === 'grid' ? groundGrid : groundPlain;
    };
    /*
    WHICH PRESET A RECIPE IS: its own name when that is a preset, else
    'custom'. The working copy is kept under that, so loading a geyser while
    the volcano was showing does not overwrite the volcano.
    */
    const adopt = (r) => {
        recipe = clone(r);
        ui.preset =
            r.name != null && EFFECT_PRESETS[r.name] != null ? r.name : 'custom';
        ui.layer = 0;
        if (player != null)
            player.activity = recipe.activity ?? 1;
    };
    /** The recipe changed: play the new one (a one-shot from the start). */
    const changed = (restart = false) => {
        edited();
        if (player == null)
            return;
        lift();
        player.setRecipe(clone(recipe));
        if (restart || recipe.duration != null)
            player.play();
    };
    const status = () => {
        const delay = soundDelay(ui.distance);
        return `${recipe.duration != null ? `one-shot, ${recipe.duration} s` : 'loops'} · sound ${delay.toFixed(2)} s late at ${ui.distance} m`;
    };
    const num = (label, get, set, min, max, step) => slider3d({
        label,
        value: get(),
        min,
        max,
        step,
        handleChange: (v) => {
            set(v);
            changed();
        },
    });
    const layerWidgets = (l) => {
        const w = [
            num('start', () => l.start ?? 0, (v) => (l.start = v), 0, 5, 0.05),
        ];
        if (recipe.duration != null || l.duration != null)
            w.push(num('lasts', () => l.duration ?? recipe.duration ?? 1, (v) => (l.duration = v), 0.05, 15, 0.05));
        if (l.kind === 'particles') {
            w.push(num('per second', () => l.rate, (v) => (l.rate = v), 0, 300, 1), num('burst', () => l.burst ?? 0, (v) => (l.burst = v), 0, 300, 1), num('life', () => l.life[1], (v) => (l.life = [Math.min(l.life[0], v), v]), 0.1, 12, 0.05), num('speed', () => l.speed[1], (v) => (l.speed = [Math.min(l.speed[0], v * 0.6), v]), 0, 40, 0.1), num('size', () => l.size[1], (v) => (l.size = [Math.min(l.size[0], v * 0.6), v]), 0.01, 8, 0.01), num('gravity', () => l.gravity ?? 0, (v) => (l.gravity = v), -5, 20, 0.1), num('wind', () => l.wind ?? 0, (v) => (l.wind = v), 0, 1, 0.05), num('height', () => l.height ?? 0, (v) => (l.height = v), 0, 10, 0.05), button3d({
                label: l.texture
                    ? 'picture: yours (change…)'
                    : 'picture: ' + l.sprite + ' (use your own…)',
                handleClick: () => void chooseFile('image/*,.svg').then((f) => {
                    if (f == null)
                        return;
                    // Embedded as a data: URL, so a saved recipe carries its art.
                    const reader = new FileReader();
                    reader.onload = () => {
                        l.texture = String(reader.result);
                        changed();
                        refresh();
                    };
                    reader.readAsDataURL(f);
                }),
            }), ...(l.texture
                ? [
                    button3d({
                        label: 'back to the ' + l.sprite + ' sprite',
                        handleClick: () => {
                            delete l.texture;
                            changed();
                            refresh();
                        },
                    }),
                ]
                : []), color3d({
                label: 'first colour',
                value: l.colors[0],
                handleCommit: (hex) => {
                    l.colors[0] = hex;
                    changed();
                },
            }), color3d({
                label: 'last colour',
                value: l.colors[l.colors.length - 1],
                handleCommit: (hex) => {
                    l.colors[l.colors.length - 1] = hex;
                    changed();
                },
            }));
        }
        else if (l.kind === 'light') {
            w.push(num('intensity', () => l.intensity, (v) => (l.intensity = v), 0, 60, 0.1), num('range', () => l.range, (v) => (l.range = v), 0.5, 80, 0.5), num('flicker', () => l.flicker ?? 0, (v) => (l.flicker = v), 0, 1, 0.01), num('height', () => l.height ?? 0, (v) => (l.height = v), 0, 10, 0.05), color3d({
                label: 'colour',
                value: l.color,
                alpha: false,
                handleCommit: (hex) => {
                    l.color = hex;
                    changed();
                },
            }));
        }
        else {
            w.push(select3d({
                label: 'voice',
                value: l.voice,
                options: [...VOICES],
                handleChange: (v) => {
                    l.voice = v;
                    changed();
                },
            }), num('gain', () => l.gain, (v) => (l.gain = v), 0, 1.5, 0.01), num('pitch', () => l.pitch ?? 1, (v) => (l.pitch = v), 0.25, 3, 0.01));
        }
        return w;
    };
    const panel = () => {
        const layers = recipe.layers;
        ui.layer = Math.min(ui.layer, layers.length - 1);
        const w = [
            label3d({ text: 'Effect', collapsible: true, open: true }),
            select3d({
                label: 'preset',
                value: ui.preset,
                options: [
                    ...Object.keys(EFFECT_PRESETS),
                    ...(ui.preset === 'custom' ? ['custom'] : []),
                ],
                handleChange: (v) => {
                    if (v === 'custom')
                        return;
                    ui.preset = String(v);
                    recipe =
                        (files ? recall(ui.preset) : null) ?? effectPreset(ui.preset);
                    ui.layer = 0;
                    if (player != null) {
                        player.activity = recipe.activity ?? 1;
                        changed(true);
                    }
                    refresh();
                },
            }),
            button3d({ label: 'play', handleClick: () => player?.play() }),
            button3d({ label: 'stop', handleClick: () => player?.stop() }),
            slider3d({
                label: 'activity',
                value: player?.activity ?? recipe.activity ?? 1,
                min: 0,
                max: 1,
                step: 0.01,
                handleChange: (v) => {
                    if (player != null)
                        player.activity = v;
                    recipe.activity = v;
                    edited();
                },
            }),
        ];
        if (ui.preset === 'volcano')
            w.push(select3d({
                label: 'state',
                value: Object.entries(VOLCANO_STATES).find(([, a]) => Math.abs(a - (player?.activity ?? 0)) < 0.02)?.[0] ?? 'semi-active',
                options: Object.keys(VOLCANO_STATES),
                handleChange: (v) => {
                    const a = VOLCANO_STATES[v];
                    if (player != null)
                        player.activity = a;
                    recipe.activity = a;
                    edited();
                    refresh();
                },
            }));
        w.push(toggle3d({
            label: 'mute',
            value: ui.muted,
            handleChange: (v) => {
                ui.muted = v;
                if (player != null)
                    player.muted = v;
            },
        }), slider3d({
            label: 'listen from',
            value: ui.distance,
            min: 8,
            max: 600,
            step: 1,
            format: (v) => `${v} m`,
            handleChange: (v) => {
                ui.distance = v;
                if (cam != null)
                    cam.radius = v;
                // The status line says how late the sound is; a refresh waits for
                // the drag to end.
                refresh();
            },
        }), ...(staged
            ? [
                select3d({
                    label: 'backdrop',
                    value: ui.backdrop,
                    options: ['grid', 'sky'],
                    handleChange: (v) => {
                        setBackdrop(v);
                        refresh();
                    },
                }),
                ...(ui.backdrop === 'sky'
                    ? [
                        slider3d({
                            label: 'time of day',
                            value: ui.timeOfDay,
                            min: 0,
                            max: 24,
                            step: 0.1,
                            handleChange: (v) => {
                                ui.timeOfDay = v;
                                sky.timeOfDay = v;
                            },
                        }),
                    ]
                    : []),
            ]
            : []), label3d({ text: status(), muted: true, compact: true }), label3d({ text: 'Layers', collapsible: true, open: true }), select3d({
            label: 'layer',
            value: ui.layer,
            options: layers.map((l, i) => ({
                label: `${i + 1}. ${l.name ?? l.kind} (${l.kind})`,
                value: i,
            })),
            handleChange: (v) => {
                ui.layer = Number(v);
                refresh();
            },
        }), ...(layers[ui.layer] != null ? layerWidgets(layers[ui.layer]) : []), label3d({ text: 'Recipe', collapsible: true }), ...(files
            ? [
                button3d({
                    label: 'save',
                    handleClick: () => {
                        const url = URL.createObjectURL(new Blob([JSON.stringify(recipe, null, 2)], {
                            type: 'application/json',
                        }));
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${recipe.name ?? ui.preset}.effect.json`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    },
                }),
                button3d({
                    label: 'load',
                    handleClick: () => void chooseFile('.json').then(async (f) => {
                        if (f == null)
                            return;
                        try {
                            const r = JSON.parse(await f.text());
                            const problems = validateEffectRecipe(r);
                            if (problems.length)
                                ui.status = `not an effect: ${problems[0]}`;
                            else {
                                adopt(r);
                                changed(true);
                            }
                        }
                        catch (e) {
                            ui.status = `could not read it: ${e.message}`;
                        }
                        refresh();
                    }),
                }),
                button3d({
                    label: 'copy',
                    handleClick: () => void navigator.clipboard?.writeText(JSON.stringify(recipe, null, 2)),
                }),
            ]
            : []), button3d({
            label: 'start over',
            handleClick: () => {
                recipe = effectPreset(ui.preset) ?? recipe;
                ui.layer = 0;
                if (player != null)
                    player.activity = recipe.activity ?? 1;
                changed(true);
                refresh();
            },
        }));
        if (ui.status)
            w.push(label3d({ text: ui.status, muted: true, compact: true }));
        return w;
    };
    if (hosted) {
        panelEl = b3dPanel({
            icon: 'star',
            title: 'Effect',
            exclusive: 'off',
            open: true,
        });
        panelEl.svg = panelSvg();
        owner.append(panelEl);
        cleanups.push(() => {
            owner._closeSystemPanel?.(panelEl);
            panelEl?.remove();
        });
    }
    const scene = owner.scene;
    // The camera: a host's is driven and restored exactly; else our own.
    if (options.camera != null) {
        const c = options.camera;
        cam = c;
        const was = {
            alpha: c.alpha,
            beta: c.beta,
            radius: c.radius,
            target: c.target.clone(),
            minZ: c.minZ,
            maxZ: c.maxZ,
        };
        cleanups.push(() => {
            c.minZ = was.minZ;
            c.maxZ = was.maxZ;
            c.setTarget(was.target);
            c.alpha = was.alpha;
            c.beta = was.beta;
            c.radius = was.radius;
        });
    }
    else {
        const before = scene.activeCamera;
        const own = new BABYLON.ArcRotateCamera('effect-cam', -2.1, 1.3, ui.distance, new BABYLON.Vector3(-8, 6, 0), scene);
        own.minZ = 0.1;
        own.maxZ = 4000;
        own.attachControl(scene.getEngine().getRenderingCanvas(), true);
        const unOrbit = touchOrbit(own);
        owner.setActiveCamera(own);
        cam = own;
        cleanups.push(() => {
            unOrbit();
            if (before != null && !before.isDisposed())
                owner.setActiveCamera(before);
            own.dispose();
        });
    }
    if (staged) {
        const g = BABYLON.MeshBuilder.CreateGround('effect-ground', { width: 1600, height: 1600 }, scene);
        ground = g;
        const plain = new BABYLON.StandardMaterial('effect-ground', scene);
        groundPlain = plain;
        plain.diffuseColor = new BABYLON.Color3(0.32, 0.3, 0.28);
        plain.specularColor = BABYLON.Color3.Black();
        // Lines every metre, heavier every ten.
        const grid = new GridMaterial('effect-grid', scene);
        groundGrid = grid;
        grid.gridRatio = 1;
        grid.majorUnitFrequency = 10;
        grid.minorUnitVisibility = 0.35;
        grid.mainColor = new BABYLON.Color3(0.36, 0.37, 0.39);
        grid.lineColor = new BABYLON.Color3(0.58, 0.6, 0.63);
        setBackdrop(ui.backdrop);
        cleanups.push(() => {
            sky.remove();
            g.dispose();
            plain.dispose();
            grid.dispose();
        });
    }
    const node = options.target ?? new BABYLON.TransformNode('effect-here', scene);
    if (options.target == null)
        cleanups.push(() => node.dispose());
    here = node;
    lift();
    player = new EffectPlayer(scene, node, clone(recipe), {
        windAt: (x, z) => owner.weatherAt(x, z).wind,
    });
    player.play();
    cleanups.push(() => {
        player?.dispose();
        player = null;
    });
    const api = {
        get recipe() {
            return clone(recipe);
        },
        set recipe(r) {
            const problems = validateEffectRecipe(r);
            if (problems.length)
                throw new Error(`not an effect recipe: ${problems[0]}`);
            adopt(r);
            // The host's own edit: played, not announced back to it.
            if (files)
                remember(ui.preset, recipe);
            if (player != null) {
                lift();
                player.setRecipe(clone(recipe));
                player.play();
            }
            refresh();
        },
        get player() {
            return player;
        },
    };
    const handle = events;
    handle.api = api;
    handle.widgets = panel;
    handle.unmount = () => {
        if (disposed)
            return;
        commitNow();
        disposed = true;
        if (idle != null)
            clearTimeout(idle);
        for (const undo of cleanups.reverse()) {
            try {
                undo();
            }
            catch (e) {
                console.warn('effect tool: unmount step failed', e);
            }
        }
        cleanups.length = 0;
    };
    refresh();
    return handle;
}
/**
 * The effect tool page: a `<tosi-b3d>` of its own with the tool mounted in
 * it, its panel the scene's settings panel. `el.effect` is the API;
 * `change` and `commit` are dispatched on the element.
 */
export function effectTool() {
    let handle = null;
    const el = b3d({
        style: { width: '100%', height: '100%' },
        clearColor: '#6b6e73',
        panelTitle: 'Effect',
        scenePanelOpen: true,
        scenePanel: () => handle?.widgets() ?? [],
        sceneCreated(owner) {
            handle = mountEffectTool(owner, { hosted: false });
            for (const type of ['change', 'commit'])
                handle.addEventListener(type, (e) => el.dispatchEvent(new CustomEvent(type, { detail: e.detail })));
            el.effect = handle.api;
            owner.refreshScenePanel?.();
        },
    }, b3dLight({ intensity: 0.5 }));
    return el;
}
//# sourceMappingURL=effect-tool.js.map