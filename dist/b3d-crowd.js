/*#
# b3d-crowd

**Many animated figures, one draw call.** The Babylon half of
[[vertex-animation]] — a baker, a material plugin that replays the bake in the
vertex shader, and thin instances so the CPU does nothing per figure per frame.

## Demo — the bench

Drag `figures` up and watch **GPU worst**, not the wall clock. The slider is
LOGARITHMIC and goes to 200,000 on purpose: the first version stopped at 4000
and the answer came back "flat, 18ms at any number", which is what you measure
when the load never bends anything and vsync is doing the talking.

⚠️ **No GPU timer in Safari.** WebKit has never shipped
`EXT_disjoint_timer_query` — it is a timing-attack surface — so the GPU line
reads `—` there and no amount of asking will change it. Chrome gives it to you.
Where it is missing the only reading available is the wall clock, which means
the bench can see cost only ONCE YOU ARE OVER BUDGET: under ~16.7ms it can tell
you that you fitted and nothing else. That is often enough (200,000 figures at
33ms is a real measurement) and it is worth knowing the floor is blind.

⚠️ **`wall` is not a cost.** It is the gap between frames, and with vsync on it
reads ~16.7ms however little work you do. A flat 18ms means "we never missed a
frame" — excellent news, and no information about the crowd. `GPU` is the
number: `EXT_disjoint_timer_query` asking the hardware how long it actually
took. Where the extension is missing it says so rather than reporting zero.

The reading is in the **Perf Stats panel** under **Crowd** — figures, draw
calls, this frame, the worst since you last moved the slider, and the budget it
is being judged against. `reset worst` is a button because in a headset there is
no console to clear, and because the worst you care about is the worst since the
last thing you changed.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dCrowd, slider3d, label3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { tosi } from 'tosijs'

// BOUND, not literal. The panel is REBUILT whenever it reopens — maximising the
// demo does it — and a control whose `value` is a literal comes back holding
// that literal, so everything you had set is silently lost. Tonio: "the
// settings for the panel aren't properly bound so on refresh the current values
// get lost."
//
// A tosijs leaf passed as `value` is a boxed proxy the control reads and writes
// through, so the panel can be rebuilt any number of times and still show the
// truth. It is also what keeps the flat and in-VR panels agreeing, since both
// bind the same leaf.
//
// (Line comments. A block comment in a fence closes the enclosing doc comment —
// the third time this file has taught me that.)
// ONE number, used by both. The bound default and the element's `count` are the
// same fact, and writing it twice is how the panel came up saying 2000 over a
// crowd of 200 — a control that lies about the thing it controls, and no way to
// tell except by counting figures.
const FIGURES = 400
const demo = tosi({ crowdBench: { figures: FIGURES, interp: true, skinned: 0 } })
const s = demo.crowdBench

let crowd = null
let scene = null

const panel = () => [
  label3d({ text: 'Crowd bench' }),
  slider3d({
    label: 'figures', value: s.figures, min: 1, max: 200000, scale: 'log', showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.count = Math.round(v) },
  }),
  toggle3d({
    label: 'interpolate frames', value: s.interp,
    handleChange: (v) => { if (crowd) crowd.interpolate = v ? 'on' : 'off' },
  }),
  slider3d({
    label: 'skinned baseline', value: s.skinned, min: 0, max: 400, step: 1, showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.skinned = Math.round(v) },
  }),
  label3d({ text: 'Perf Stats → Crowd for the numbers', muted: true }),
]

crowd = b3dCrowd({ count: FIGURES, spread: 80, bakeFps: 10 })

scene = b3d(
  {
    style: 'width:100%;height:100%',
    scenePanelOpen: true,
    scenePanel: panel,
    sceneCreated(el) {
      orbitCam(el, { alpha: -1.1, beta: 1.12, radius: 85, target: [0, 2, 0] })
    },
  },
  b3dSun({}),
  b3dSkybox({ timeOfDay: 10 }),
  b3dLight({ intensity: 0.45 }),
  crowd
)

preview.append(scene)
```
```css
.preview { height: 100%; }
```

## Does it actually work?

The shader is the part that fails silently: a VAT that will not compile leaves a
black canvas, which looks exactly like a camera pointing the wrong way. So the
page checks itself.

⚠️ **The block below goes EMPTY on purpose**, and that is the check passing. It
builds a crowd, waits for the material to become ready, and then removes its
scene — because it is the page's second WebGL context and Safari counts those
much more tightly than Chrome. An empty box here means the assertion ran; look
at the test badge, not at the box.

```test
import { b3d, b3dLight, b3dCrowd } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

test('the crowd builds, and its shader COMPILES', async () => {
  const crowd = b3dCrowd({ count: 32, spread: 6, bakeFps: 8 })
  const scene = b3d(
    {
      style: 'width:320px;height:200px',
      // A camera, or this is a black box in the docs even when it passes — and
      // a black box beside the words "does it actually work?" answers itself
      // wrongly.
      sceneCreated: (el) => orbitCam(el, { alpha: -1.2, beta: 1.15, radius: 14, target: [0, 1, 0] }),
    },
    b3dLight({ intensity: 0.9 }),
    crowd
  )
  preview.append(scene)

  // The scene mounts on its own schedule; poll rather than guess a delay.
  const until = async (why, fn) => {
    for (let i = 0; i < 200; i++) {
      if (fn()) return
      await new Promise((r) => setTimeout(r, 50))
    }
    throw new Error(why)
  }

  await until('scene never came up', () => scene.scene != null)
  let mesh = null
  await until('no crowd mesh', () => {
    mesh = scene.scene.meshes.find((m) => m.name === 'crowd-figure')
    return mesh != null
  })

  // One draw call for all of them — the whole claim.
  expect(mesh.thinInstanceCount).toBe(32)

  // `isReady` is the assertion that matters. A material whose vertex shader
  // failed to compile never becomes ready, and nothing else here would notice —
  // the canvas simply stays black, which is indistinguishable from a camera
  // pointing at nothing.
  //
  // (LINE comments, not a block one: a close-comment token inside a fence ends
  // the enclosing doc comment, and every line after it becomes TypeScript. That
  // is tosijs-ui#142's third trap — and note this warning cannot SPELL the
  // token either, which is the same joke the original report made about itself.)
  await until('the VAT shader never compiled', () => mesh.material.isReady(mesh))
  expect(mesh.material.isReady(mesh)).toBe(true)

  // HAND THE CONTEXT BACK. This scene is the page's SECOND WebGL context, and
  // Safari caps contexts far more tightly than Chrome — a test that keeps one
  // for the life of the page leaves a black rectangle under the words "does it
  // actually work?", which answers them wrongly. Removing the element disposes
  // the engine (see tosi-b3d's teardown), so the check costs a context for a
  // few seconds rather than for the session.
  scene.remove()
})
```

## Where it sits: the third rung of the ambient ladder

Three tiers of "many things", and they are not competitors:

| | what it draws | cost | for |
| --- | --- | --- | --- |
| [[b3d-ambient]] | camera-facing billboards — motes, rain, bubbles | almost nothing | dressing you look past |
| [[ambient-leaves]] | tumbling two-sided quads, a `SolidParticleSystem` | small | things needing a 3-D attitude |
| **this** | animated MESHES, one draw call | a texture and two fetches | things that must be ALIVE |

A bird is not a billboard: it flaps, it banks, and its silhouette changes. That
is the gap this fills — and `b3d-ambient`'s existing budget allocator is the
right thing to route it through, because it already knows how to switch an
effect OFF rather than thin it, which is the correct answer when a flock will
not fit.

## The target, and what it means that we cleared it

The game this was built to answer for is a virtual miniatures battle. Tonio's
original ran on an Amiga 500 — 7MHz, 320×200, 16 colours, about 10fps — where a
unit of regulars was 15 figures and one of irregulars 7, and an army was three
to nine units laid out three wide. So:

| | |
| --- | --- |
| largest army | 9 units × 15 = **135 figures** |
| a whole battle | **~270** |
| measured here | **200,000 at 33ms** |
| headroom | **~740×** |

That is not "we can do it". That is the constraint having moved somewhere else
entirely, which is the outcome worth acting on rather than celebrating.

**So figure COUNT should stop shaping the design.** The Amiga's answer to 270
figures was two or three animation states and 4-bit sprites; ours does not have
to be, and the budget freed should go where this project's north star says it
goes — *agents and reactions, not vertices* (`AI-DESIGN.md`). At 270 figures
every one of them can afford a real sensorium, its own equipment via
[[vertex-animation|sockets]], and a bake rate high enough that clip blending is
not a luxury reserved for wildlife.

**And it reopens a question the bench was built to close.** If 270 is this far
inside the envelope, the honest next question is whether the vertex-animated
path is needed *for this game at all* — a skinned `b3d-biped` may handle 270
perfectly well, in which case VAT is the tool for background fauna and for
scenes an order of magnitude larger, not for the battle. That is exactly what
the skinned baseline below is for, and it is now the only number this bench
still owes.

## ⚠️ Rendering is not the expensive part, and this bench only measures rendering

Tonio: *"I imagine things like collision detection and so on could vastly
outweigh the animation costs."* Almost certainly, and it is worth being explicit
that **this bench cannot see any of it**. One draw call is a claim about the
GPU; collision, steering and AI are CPU work per figure per frame, and that is
the cost that does not get instanced away. A result of 200,000 at 33ms says the
drawing is free. It says nothing about the thinking.

### The original game already had the answer

*"In the original game the figures were walking on a virtual game board and
basically offset within a square, so basically collision detection was just were
you trying to enter an occupied square."*

That is not a concession to a 7MHz 68000 — it is the right design, and it should
be copied rather than out-grown:

| | grid occupancy | continuous collision |
| --- | --- | --- |
| cost of a move | **O(1)** — is that cell taken? | broadphase + narrowphase against neighbours |
| cost at N figures | **O(N)** | O(N·k), and k grows with density |
| formations | fall out — a rank IS a row of cells | emergent, and fight the solver |
| "can I stand there?" | a lookup | a query with a tolerance you tune forever |

A figure being *offset within* its square is what buys the look back: the
occupancy is discrete and the pose is continuous, so it reads as a crowd rather
than as a chessboard. That separation is the whole trick, and it is worth
writing down before anyone reaches for a physics engine.

`world-topology.ts` already carries the coordinate-free half of this idea
(places, portals, containment), and `terrain-grid.ts` the tile maths. A battle
grid is closer to those than it is to `b3d-collisions`.

## The baseline is the point of comparison

`skinned` spawns N clones of a real rigged GLB, each with its own skeleton and
`AnimationGroup` — which is what a `b3d-biped` does and what the vertex-animated
path deliberately does not. Tonio: *"the old omnidude mesh had a modest vertex
count. That might let you test a skinned mesh without much effort."*

Run the two side by side at the same count and the RATIO is the answer to
whether "actors and crowd" is a real boundary or an unnecessary one. Its slider
stops at 400 rather than 200,000, which is itself part of the finding.

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `count` | `200` | How many figures. One draw call whatever it is |
| `spread` | `60` | Metres across the field they scatter over |
| `bakeFps` | `10` | Frames baked per second of clip — the memory knob |
| `interpolate` | `'on'` | `'off'` snaps to the nearest frame: cheaper, jerkier |
| `skinned` | `0` | How many SKINNED clones to spawn alongside, as the baseline |
| `skinnedUrl` | `'/omnidude.glb'` | The GLB the baseline clones |

## Why a plugin and not a ShaderMaterial

A bench that skips lighting measures the wrong thing. `MaterialPluginBase`
injects into the STANDARD material, so these figures are lit, fogged and shadowed
exactly like everything else and the number means something. Same route
[[biome-plugin]] takes, for the same reason.

## What the shader does per vertex

Two texture fetches and a `mix`. Everything else — which clip, how far through
it, how fast — arrives as a per-instance attribute, and `phase` is derived from
a single `vatTime` uniform rather than written per figure per frame. That is the
whole trick: **the CPU touches nothing once the crowd is built.**

## The bench is deliberately synthetic

The figure is generated, not loaded, and its animation is a procedural walk.
That is on purpose: the question is what the RENDERING architecture costs at N,
and loading real assets would fold an asset pipeline into a measurement that is
not about one. Baking from a real skinned GLB is the next step, and the layout
it bakes into is already fixed and tested.
*/
/*{ "parent": "Performance", "order": 119 }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild, sceneDelta } from './b3d-utils.js';
import { MersenneTwister } from './mersenne-twister.js';
import { framesForClip, vatBytes, vatLayout, vatTexel, } from './vertex-animation.js';
/**
 * Write a bake into two float textures.
 *
 * `sample(vertexIndex, frame)` returns the position and normal for one vertex
 * of one frame; the caller decides where those come from — a procedural walk
 * here, a CPU-skinned GLB next.
 *
 * NEAREST sampling, and no mipmaps: a filtered VAT blends a vertex with its
 * NEIGHBOUR, which is a different vertex of the same figure, and the mesh comes
 * apart in a way that looks like bad weights rather than bad sampling.
 */
export function writeVatTextures(scene, layout, sample) {
    const n = layout.width * layout.height * 4;
    const pos = new Float32Array(n);
    const nor = new Float32Array(n);
    for (let f = 0; f < layout.frameCount; f++) {
        for (let v = 0; v < layout.vertexCount; v++) {
            const { x, y } = vatTexel(layout, v, f);
            const i = (y * layout.width + x) * 4;
            const s = sample(v, f);
            pos[i] = s.p[0];
            pos[i + 1] = s.p[1];
            pos[i + 2] = s.p[2];
            pos[i + 3] = 1;
            nor[i] = s.n[0];
            nor[i + 1] = s.n[1];
            nor[i + 2] = s.n[2];
            nor[i + 3] = 0;
        }
    }
    const make = (data, name) => {
        const t = new BABYLON.RawTexture(data, layout.width, layout.height, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, // no mipmaps
        false, BABYLON.Texture.NEAREST_SAMPLINGMODE, BABYLON.Engine.TEXTURETYPE_FLOAT);
        t.name = name;
        t.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        t.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        return t;
    };
    return { position: make(pos, 'vat-pos'), normal: make(nor, 'vat-nor') };
}
/**
 * Replay a bake in the vertex shader.
 *
 * Injected into the standard material so the figures are lit like everything
 * else — see the note above about a bench that skips lighting.
 */
export class VatPlugin extends BABYLON.MaterialPluginBase {
    bake = null;
    /** Seconds, advanced by the owner. One uniform drives every figure. */
    time = 0;
    /** `false` snaps to the nearest frame — the cheap path for a crowd. */
    interpolate = true;
    constructor(material) {
        super(material, 'Vat', 220, { VAT: false, VAT_LERP: false });
    }
    _on = false;
    get isEnabled() {
        return this._on;
    }
    set isEnabled(v) {
        if (this._on === v)
            return;
        this._on = v;
        this.markAllDefinesAsDirty();
        this._enable(v);
    }
    prepareDefines(defines) {
        defines.VAT = this._on;
        defines.VAT_LERP = this._on && this.interpolate;
    }
    getAttributes(attributes) {
        // The vertex's own index, and the per-instance playback state. Both are
        // buffers on the mesh; neither is touched again after the crowd is built.
        attributes.push('vatIndex');
        attributes.push('vatState');
    }
    getSamplers(samplers) {
        samplers.push('vatPos', 'vatNor');
    }
    getUniforms() {
        return {
            ubo: [
                { name: 'vatInfo', size: 4, type: 'vec4' },
                { name: 'vatTime', size: 1, type: 'float' },
            ],
            vertex: `
        uniform vec4 vatInfo;
        uniform float vatTime;
      `,
        };
    }
    bindForSubMesh(uniformBuffer) {
        const b = this.bake;
        if (!this._on || b == null)
            return;
        uniformBuffer.updateFloat4('vatInfo', b.layout.width, b.layout.height, b.layout.rowsPerFrame, b.layout.vertexCount);
        uniformBuffer.updateFloat('vatTime', this.time);
        uniformBuffer.setTexture('vatPos', b.position);
        uniformBuffer.setTexture('vatNor', b.normal);
    }
    getClassName() {
        return 'VatPlugin';
    }
    getCustomCode(shaderType) {
        if (shaderType !== 'vertex')
            return null;
        return {
            CUSTOM_VERTEX_DEFINITIONS: `#ifdef VAT
        attribute float vatIndex;
        attribute vec4 vatState;
        uniform sampler2D vatPos;
        uniform sampler2D vatNor;

        // Exact texel, plus half — a VAT must never be filtered across
        // neighbours, because the neighbour is a different vertex.
        vec2 vatUv(float vIndex, float frame) {
          float w = vatInfo.x;
          float col = mod(vIndex, w);
          float rowInFrame = floor(vIndex / w);
          float y = frame * vatInfo.z + rowInFrame;
          return (vec2(col, y) + 0.5) / vec2(vatInfo.x, vatInfo.y);
        }
      #endif`,
            CUSTOM_VERTEX_UPDATE_POSITION: `#ifdef VAT
        // vatState = (clipStart, clipFrames, phaseOffset, cyclesPerSecond)
        float vatFrames = max(vatState.y, 1.0);
        float vatPhase = fract(vatState.z + vatTime * vatState.w);
        float vatScaled = vatPhase * vatFrames;
        float vatI = floor(vatScaled);
        float vatA = vatState.x + mod(vatI, vatFrames);
        #ifdef VAT_LERP
          float vatT = vatScaled - vatI;
          float vatB = vatState.x + mod(vatI + 1.0, vatFrames);
          positionUpdated = mix(
            texture2D(vatPos, vatUv(vatIndex, vatA)).xyz,
            texture2D(vatPos, vatUv(vatIndex, vatB)).xyz,
            vatT
          );
          normalUpdated = normalize(mix(
            texture2D(vatNor, vatUv(vatIndex, vatA)).xyz,
            texture2D(vatNor, vatUv(vatIndex, vatB)).xyz,
            vatT
          ));
        #else
          positionUpdated = texture2D(vatPos, vatUv(vatIndex, vatA)).xyz;
          normalUpdated = normalize(texture2D(vatNor, vatUv(vatIndex, vatA)).xyz);
        #endif
      #endif`,
        };
    }
}
/* ------------------------------------------------------------------ *
 * The synthetic figure — see the note about the bench being generated.
 * ------------------------------------------------------------------ */
/** A blocky humanoid: torso, head, two arms, two legs. ~200 vertices. */
function figureParts() {
    return [
        { size: [0.5, 0.7, 0.3], at: [0, 1.15, 0], limb: 0 },
        { size: [0.32, 0.32, 0.32], at: [0, 1.66, 0], limb: 0 },
        { size: [0.16, 0.6, 0.16], at: [-0.36, 1.2, 0], limb: 1 },
        { size: [0.16, 0.6, 0.16], at: [0.36, 1.2, 0], limb: 2 },
        { size: [0.2, 0.8, 0.2], at: [-0.15, 0.4, 0], limb: 3 },
        { size: [0.2, 0.8, 0.2], at: [0.15, 0.4, 0], limb: 4 },
    ];
}
/** Swing a limb about its top, so a leg pivots at the hip and not its middle. */
function limbSwing(limb, phase) {
    if (limb === 0)
        return 0;
    const t = phase * Math.PI * 2;
    // Arms oppose legs, and left opposes right — which is what reads as walking.
    if (limb === 1)
        return Math.sin(t) * 0.5;
    if (limb === 2)
        return -Math.sin(t) * 0.5;
    if (limb === 3)
        return -Math.sin(t) * 0.7;
    return Math.sin(t) * 0.7;
}
/**
 * Build the figure mesh, and bake a walk for it.
 *
 * Returns the mesh with its `vatIndex` attribute already attached — the shader
 * needs to know which vertex it is, and WebGL1 has no `gl_VertexID`.
 */
export function buildBenchFigure(scene, bakeFps = 10) {
    const parts = figureParts();
    const boxes = parts.map((p, i) => {
        const b = BABYLON.MeshBuilder.CreateBox(`crowd-part-${i}`, { width: p.size[0], height: p.size[1], depth: p.size[2] }, scene);
        b.position.set(p.at[0], p.at[1], p.at[2]);
        return b;
    });
    const merged = BABYLON.Mesh.MergeMeshes(boxes, true, true, undefined, false, false);
    if (merged == null)
        throw new Error('b3d-crowd: could not build the bench figure');
    merged.name = 'crowd-figure';
    merged.isVisible = false;
    const positions = merged.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const normals = merged.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    const vertexCount = positions.length / 3;
    // Which part each vertex belongs to, so the bake can swing it. Boxes merge in
    // order and each contributes 24 vertices.
    const limbOf = new Int32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++) {
        limbOf[v] = parts[Math.min(parts.length - 1, Math.floor(v / 24))].limb;
    }
    const pivotOf = (limb) => limb === 1 || limb === 2 ? 1.5 : limb >= 3 ? 0.8 : 0;
    const walkFrames = framesForClip(1, bakeFps);
    const clips = [
        { name: 'walk', start: 0, frames: walkFrames, duration: 1, loop: true },
    ];
    const layout = vatLayout(vertexCount, walkFrames);
    const { position, normal } = writeVatTextures(scene, layout, (v, f) => {
        const phase = f / walkFrames;
        const limb = limbOf[v];
        const a = limbSwing(limb, phase);
        const px = positions[v * 3];
        const py = positions[v * 3 + 1];
        const pz = positions[v * 3 + 2];
        const nx = normals[v * 3];
        const ny = normals[v * 3 + 1];
        const nz = normals[v * 3 + 2];
        if (a === 0)
            return { p: [px, py, pz], n: [nx, ny, nz] };
        // Rotate about X at the limb's pivot height — a hip, not a waist.
        const pivot = pivotOf(limb);
        const dy = py - pivot;
        const c = Math.cos(a);
        const s = Math.sin(a);
        return {
            p: [px, pivot + dy * c - pz * s, dy * s + pz * c],
            n: [nx, ny * c - nz * s, ny * s + nz * c],
        };
    });
    const bake = {
        layout,
        clips,
        position,
        normal,
        bytes: vatBytes(layout),
    };
    // The vertex's own index, as an attribute. Every instance shares it.
    const index = new Float32Array(vertexCount);
    for (let v = 0; v < vertexCount; v++)
        index[v] = v;
    merged.setVerticesData('vatIndex', index, false, 1);
    return { mesh: merged, bake };
}
/**
 * `<tosi-b3d-crowd>` — N vertex-animated figures in one draw call.
 *
 * The bench for "can we manage an army of 200 bipeds". Change `count` and watch
 * the WORST frame: an average hides the one that causes nausea.
 */
export class B3dCrowd extends B3dChild {
    static preferredTagName = 'tosi-b3d-crowd';
    static initAttributes = {
        /** How many figures. */
        count: 200,
        /** Metres across the field they scatter over. */
        spread: 60,
        /** Frames baked per second of clip — the memory knob. */
        bakeFps: 10,
        /** `'off'` snaps to the nearest frame. */
        interpolate: 'on',
        /**
         * How many SKINNED clones to spawn alongside, as the baseline.
         *
         * The comparison that decides the architecture: a real skinned GLB with its
         * own skeleton and `AnimationGroup` per instance, against the same count of
         * vertex-animated figures. `0` is off.
         */
        skinned: 0,
        /** The GLB the baseline clones. Modest vertex count on purpose. */
        skinnedUrl: '/omnidude.glb',
    };
    _mesh;
    _bake;
    _plugin;
    _obs = null;
    _built = -1;
    _t = 0;
    _offDebug = null;
    /*
    THE INSTRUMENT. A bench without one is a demo.
  
    Worst frame since the last reset, not an average: an average of sixty good
    frames and one 40ms frame looks fine and is nausea. `PERF-DESIGN.md`'s rule,
    and the reason the reset is a BUTTON — you want the worst since you moved the
    slider, not the worst since the page loaded, and in a headset there is no
    console to clear.
    */
    _worstMs = 0;
    _lastMs = 0;
    _frames = 0;
    /*
    WALL TIME IS NOT COST, and the first version of this bench measured wall time.
  
    Tonio, at four thousand figures: "Performance is flat… 18ms is worst at any
    number of figures." Which is exactly right and was the wrong instrument:
    `getDeltaTime` is the gap BETWEEN frames, and with vsync on that is ~16.7ms
    however little work you do. A flat 18ms says "we never missed a frame", which
    is very good news and says nothing whatever about what the crowd costs.
  
    `EngineInstrumentation.gpuFrameTimeCounter` asks the GPU how long it actually
    took, via `EXT_disjoint_timer_query`. Where the extension is missing the
    reading says so rather than reporting zero — a bench that quietly reports 0ms
    is worse than one that admits it cannot see.
    */
    _instr;
    _sceneInstr;
    _worstGpu = 0;
    /** What the bake costs on the GPU, for the readout. */
    get bakeBytes() {
        return this._bake?.bytes ?? 0;
    }
    sceneReady(owner, scene) {
        const { mesh, bake } = buildBenchFigure(scene, this.bakeFps);
        this._mesh = mesh;
        this._bake = bake;
        const mat = new BABYLON.StandardMaterial('crowd', scene);
        mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        mat.diffuseColor = new BABYLON.Color3(0.62, 0.6, 0.55);
        const plugin = new VatPlugin(mat);
        plugin.bake = bake;
        plugin.interpolate = this.interpolate !== 'off';
        plugin.isEnabled = true;
        this._plugin = plugin;
        mesh.material = mat;
        mesh.isVisible = true;
        // The bake already holds world-space-ish positions for the figure, and a
        // thin instance supplies the rest. Bounds must be set by hand or Babylon
        // culls the whole crowd against the ONE figure's box.
        mesh.alwaysSelectAsActiveMesh = true;
        this._rebuild();
        owner.register({ meshes: [mesh] });
        const instr = new BABYLON.EngineInstrumentation(scene.getEngine());
        instr.captureGPUFrameTime = true;
        this._instr = instr;
        const sceneInstr = new BABYLON.SceneInstrumentation(scene);
        sceneInstr.captureActiveMeshesEvaluationTime = true;
        this._sceneInstr = sceneInstr;
        const gpuMs = () => 
        // Nanoseconds, and `-1` while the query has not resolved yet.
        instr.gpuFrameTimeCounter.current > 0
            ? instr.gpuFrameTimeCounter.current / 1e6
            : -1;
        this._offDebug = owner.addDebugSource({
            name: 'Crowd',
            // `mesh`, because the whole claim is that a crowd IS one mesh.
            icon: 'mesh',
            lines: () => [
                `figures ${this._built}   draws 1   verts ${((this._built * bake.layout.vertexCount) /
                    1000).toFixed(0)}k`,
                // GPU time is the COST. Wall time only tells you whether it fitted.
                this._worstGpu > 0
                    ? `GPU ${gpuMs() < 0 ? '—' : gpuMs().toFixed(2)}ms   WORST ${this._worstGpu.toFixed(2)}ms`
                    : `GPU — (no timer query on this device)`,
                `wall ${this._lastMs.toFixed(1)}ms  worst ${this._worstMs.toFixed(1)}ms  ${this._worstMs < 18 ? '(vsync — not a cost)' : ''}`,
                `meshEval ${sceneInstr.activeMeshesEvaluationTimeCounter.current.toFixed(2)}ms`,
                this._skinnedWant > 0
                    ? `SKINNED ${this._skinnedRoots.length}/${this._skinnedWant} × ${this._skinnedVerts} verts`
                    : 'skinned baseline off',
                this._skinnedNote,
                `bake ${(bake.bytes / 1024 / 1024).toFixed(2)}MB  ${bake.layout.frameCount} frames  interp ${this.interpolate !== 'off' ? 'on' : 'off'}`,
                // 13.9ms is a Quest frame; 16.7 is 60Hz flat. Naming the budget beside
                // the number is what makes it a measurement rather than a readout.
                `budget 13.9ms (VR) / 16.7ms (flat)`,
            ],
            actions: [
                {
                    label: 'reset worst',
                    handleClick: () => {
                        this._worstMs = 0;
                        this._worstGpu = 0;
                        this._frames = 0;
                    },
                },
            ],
        });
        this._obs = scene.onBeforeRenderObservable.add(() => {
            /*
            TWO CLOCKS, and they are not the same one.
      
            The METRIC wants the engine's whole-frame time — that IS the frame, and
            the worst one is the question. The ANIMATION wants `sceneDelta`, because a
            scene observer can run more than once per engine frame (the render loop,
            and again per active camera) and the engine's delta is the whole frame
            EACH time. Using it to advance a clock runs everything at 2× or 4× and
            fails silently: the motion is smooth, just wrong, and it scales with how
            many cameras a scene happens to have.
      
            That is CLAUDE.md's own warning and it cost fourteen call sites in 0.7.0.
            I walked straight into it here.
            */
            const ms = scene.getEngine().getDeltaTime();
            this._lastMs = ms;
            /*
            SKIP THE FIRST FEW. A rebuild, a shader compile and the first upload all
            land in one frame, and reporting that as the worst says the crowd is
            expensive when what was expensive was building it. The bench is about the
            STEADY state.
            */
            if (++this._frames > 10 && ms > this._worstMs)
                this._worstMs = ms;
            if (this._frames > 10) {
                const g = instr.gpuFrameTimeCounter.current / 1e6;
                if (g > this._worstGpu)
                    this._worstGpu = g;
            }
            // PAUSE STOPS THEM. It did not, because this clock never consulted it —
            // and a pause that leaves four thousand figures marching is not a pause.
            if (owner.paused !== true)
                this._t += sceneDelta(scene);
            if (this._plugin != null)
                this._plugin.time = this._t;
            const wantSkinned = Math.max(0, Math.round(this.skinned));
            if (this._skinnedWant !== wantSkinned) {
                void this._buildSkinned(scene, wantSkinned);
                this._worstGpu = 0;
                this._worstMs = 0;
                this._frames = 0;
            }
            this._pumpSkinned();
            if (this._built !== Math.round(this.count)) {
                this._rebuild();
                // A change of count is a new measurement.
                this._worstMs = 0;
                this._worstGpu = 0;
                this._frames = 0;
            }
            if (this._plugin != null) {
                const want = this.interpolate !== 'off';
                if (this._plugin.interpolate !== want) {
                    this._plugin.interpolate = want;
                    this._plugin.markAllDefinesAsDirty();
                }
            }
        });
    }
    _skinnedRoots = [];
    _skinnedBuilt = -1;
    _skinnedVerts = 0;
    _skinnedWant = 0;
    _skinnedNote = '';
    _container = null;
    _skinnedPrng = new MersenneTwister(7);
    /**
     * Spawn N SKINNED clones — the baseline the whole question turns on.
     *
     * Each carries its own skeleton and `AnimationGroup`, which is what a
     * `b3d-biped` does and what the vertex-animated path deliberately does not.
     * The comparison is the point: if the ratio is small, "actors and crowd" is
     * an unnecessary boundary; if it is large, it is a real one.
     *
     * Loaded once and CLONED, so the measurement is of drawing and animating them
     * rather than of parsing a GLB N times.
     */
    async _buildSkinned(scene, n) {
        this._skinnedWant = n;
        if (n < this._skinnedRoots.length) {
            for (const r of this._skinnedRoots.splice(n))
                r.dispose(false, true);
        }
        if (n === 0) {
            this._skinnedNote = '';
            return;
        }
        if (this._container == null) {
            /*
            SURFACE THE FAILURE. The first version did `void this._buildSkinned(...)`
            and swallowed everything — so a load that 404s or a GLB that will not
            parse produced a slider that silently did nothing, which is exactly what
            it looked like from outside. A bench must say when it cannot measure.
            */
            try {
                const slash = this.skinnedUrl.lastIndexOf('/');
                this._container = await BABYLON.SceneLoader.LoadAssetContainerAsync(this.skinnedUrl.slice(0, slash + 1), this.skinnedUrl.slice(slash + 1), scene);
                this._skinnedVerts =
                    this._container.meshes
                        .find((m) => m.getTotalVertices() > 0)
                        ?.getTotalVertices() ?? 0;
                if (this._skinnedVerts === 0) {
                    this._skinnedNote = `loaded ${this.skinnedUrl} but it has no geometry`;
                }
            }
            catch (e) {
                this._skinnedNote = `FAILED to load ${this.skinnedUrl}: ${String(e).slice(0, 60)}`;
                this._container = null;
            }
        }
    }
    /**
     * Spawn a FEW skinned rigs per frame, never a batch.
     *
     * Instantiating one clones a skeleton and its animation groups, and doing
     * three hundred of them in a loop blocks the main thread for seconds — Tonio:
     * "dragging it to 320 hung everything". That hang is itself a finding about
     * the skinned path and it is also an unusable bench, so the work is spread
     * and the readout says how far it has got.
     */
    _pumpSkinned() {
        const container = this._container;
        if (container == null)
            return;
        const want = this._skinnedWant;
        let budget = 4;
        while (this._skinnedRoots.length < want && budget-- > 0) {
            const i = this._skinnedRoots.length;
            const inst = container.instantiateModelsToScene((name) => `${name}-${i}`, false);
            const root = inst.rootNodes[0];
            if (root == null)
                break;
            const rnd = () => this._skinnedPrng.random();
            root.position.set((rnd() - 0.5) * this.spread, 0, (rnd() - 0.5) * this.spread);
            root.rotation.y = rnd() * Math.PI * 2;
            // Human scale — omnidude is 0.88m, half a person, and half-size figures
            // scattered over 150 metres read as "nothing happened".
            root.scaling.setAll(2);
            this._skinnedRoots.push(root);
            for (const g of inst.animationGroups) {
                g.play(true);
                g.goToFrame(g.from + (g.to - g.from) * rnd());
            }
        }
        this._skinnedBuilt = this._skinnedRoots.length;
    }
    /**
     * Lay the crowd out and hand the GPU its per-instance state.
     *
     * Called only when the COUNT changes — never per frame. That is the whole
     * claim being measured: once built, the CPU does nothing per figure.
     */
    _rebuild() {
        const mesh = this._mesh;
        const bake = this._bake;
        if (mesh == null || bake == null)
            return;
        const n = Math.max(1, Math.round(this.count));
        this._built = n;
        const clip = bake.clips[0];
        const matrices = new Float32Array(n * 16);
        const state = new Float32Array(n * 4);
        const m = BABYLON.Matrix.Identity();
        // A deterministic scatter — the same crowd every run, so two measurements
        // are of the same picture.
        /*
        A REAL PRNG, because the hand-rolled LCG here was broken above ~20k.
    
        `seed * 1103515245` is a DOUBLE multiply: past 2^53 the low bits are simply
        gone, so masking them back out with `& 0x7fffffff` reads noise that repeats.
        The visible symptom is figures landing on top of each other — Tonio: "About
        20,000 or so it doesn't seem to get more crowded", which is exactly what a
        degenerate sequence looks like from outside.
    
        `MersenneTwister` is already in this repo, is seeded, and does not have that
        failure. Reaching for it costs an import.
        */
        const prng = new MersenneTwister(1);
        const rnd = () => prng.random();
        const side = this.spread;
        for (let i = 0; i < n; i++) {
            const x = (rnd() - 0.5) * side;
            const z = (rnd() - 0.5) * side;
            BABYLON.Matrix.RotationYToRef(rnd() * Math.PI * 2, m);
            m.setTranslationFromFloats(x, 0, z);
            m.copyToArray(matrices, i * 16);
            state[i * 4] = clip.start;
            state[i * 4 + 1] = clip.frames;
            // A phase OFFSET per figure, or two hundred soldiers march in lockstep —
            // which reads as a bug even though every one of them is correct.
            state[i * 4 + 2] = rnd();
            state[i * 4 + 3] = 0.7 + rnd() * 0.6; // cycles per second
        }
        mesh.thinInstanceSetBuffer('matrix', matrices, 16, true);
        mesh.thinInstanceSetBuffer('vatState', state, 4, true);
    }
    sceneDispose() {
        const scene = this.owner?.scene;
        if (scene != null && this._obs != null) {
            scene.onBeforeRenderObservable.remove(this._obs);
        }
        this._obs = null;
        this._offDebug?.();
        this._offDebug = null;
        for (const r of this._skinnedRoots)
            r.dispose(false, true);
        this._skinnedRoots = [];
        this._container?.dispose();
        this._container = null;
        this._instr?.dispose();
        this._sceneInstr?.dispose();
        this._instr = undefined;
        this._sceneInstr = undefined;
        this._bake?.position.dispose();
        this._bake?.normal.dispose();
        this._mesh?.material?.dispose();
        this._mesh?.dispose();
        this._mesh = undefined;
        this._bake = undefined;
        this._plugin = undefined;
        super.sceneDispose();
    }
}
export const b3dCrowd = B3dCrowd.elementCreator();
//# sourceMappingURL=b3d-crowd.js.map