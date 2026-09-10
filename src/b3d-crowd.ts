/*#
# b3d-crowd

**Many animated figures, one draw call.** The Babylon half of
[[vertex-animation]] — a baker, a material plugin that replays the bake in the
vertex shader, and thin instances so the CPU does nothing per figure per frame.

## Demo — the bench

Drag `figures` up and watch **worst frame**, not average: a dropped frame is
nausea, and an average hides the one that matters. `PERF-DESIGN.md`'s rule.

The reading is in the **Perf Stats panel** under **Crowd** — figures, draw
calls, this frame, the worst since you last moved the slider, and the budget it
is being judged against. `reset worst` is a button because in a headset there is
no console to clear, and because the worst you care about is the worst since the
last thing you changed.

```js
import { b3d, b3dSun, b3dSkybox, b3dLight, b3dCrowd, slider3d, label3d, toggle3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'

let crowd = null
let scene = null

const panel = () => [
  label3d({ text: 'Crowd bench' }),
  slider3d({
    label: 'figures', value: 200, min: 1, max: 4000, step: 1, showValue: 'always',
    handleChange: (v) => { if (crowd) crowd.count = Math.round(v) },
  }),
  toggle3d({
    label: 'interpolate frames', value: true,
    handleChange: (v) => { if (crowd) crowd.interpolate = v ? 'on' : 'off' },
  }),
  label3d({ text: 'Perf Stats → Crowd for the numbers', muted: true }),
]

crowd = b3dCrowd({ count: 200, spread: 60, bakeFps: 10 })

scene = b3d(
  {
    style: 'width:100%;height:100%',
    scenePanelOpen: true,
    scenePanel: panel,
    sceneCreated(el) {
      orbitCam(el, { alpha: -1.1, beta: 1.15, radius: 70, target: [0, 2, 0] })
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

```test
import { b3d, b3dLight, b3dCrowd } from 'tosijs-3d'

test('the crowd builds, and its shader COMPILES', async () => {
  const crowd = b3dCrowd({ count: 32, spread: 10, bakeFps: 8 })
  const scene = b3d({ style: 'width:300px;height:200px' }, b3dLight({}), crowd)
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
})
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `count` | `200` | How many figures. One draw call whatever it is |
| `spread` | `60` | Metres across the field they scatter over |
| `bakeFps` | `10` | Frames baked per second of clip — the memory knob |
| `interpolate` | `'on'` | `'off'` snaps to the nearest frame: cheaper, jerkier |

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

import * as BABYLON from '@babylonjs/core'
import { B3dChild, sceneDelta } from './b3d-utils.js'
import type { B3d } from './tosi-b3d.js'
import {
  framesForClip,
  vatBytes,
  vatLayout,
  vatTexel,
  type VatClip,
  type VatLayout,
} from './vertex-animation.js'

/** A baked animation set: the textures, their layout, and what is in them. */
export interface VatBake {
  layout: VatLayout
  clips: VatClip[]
  position: BABYLON.RawTexture
  normal: BABYLON.RawTexture
  /** Bytes on the GPU — the number that decides whether this scales. */
  bytes: number
}

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
export function writeVatTextures(
  scene: BABYLON.Scene,
  layout: VatLayout,
  sample: (
    vertexIndex: number,
    frame: number
  ) => { p: [number, number, number]; n: [number, number, number] }
): { position: BABYLON.RawTexture; normal: BABYLON.RawTexture } {
  const n = layout.width * layout.height * 4
  const pos = new Float32Array(n)
  const nor = new Float32Array(n)
  for (let f = 0; f < layout.frameCount; f++) {
    for (let v = 0; v < layout.vertexCount; v++) {
      const { x, y } = vatTexel(layout, v, f)
      const i = (y * layout.width + x) * 4
      const s = sample(v, f)
      pos[i] = s.p[0]
      pos[i + 1] = s.p[1]
      pos[i + 2] = s.p[2]
      pos[i + 3] = 1
      nor[i] = s.n[0]
      nor[i + 1] = s.n[1]
      nor[i + 2] = s.n[2]
      nor[i + 3] = 0
    }
  }
  const make = (data: Float32Array, name: string) => {
    const t = new BABYLON.RawTexture(
      data,
      layout.width,
      layout.height,
      BABYLON.Engine.TEXTUREFORMAT_RGBA,
      scene,
      false, // no mipmaps
      false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE,
      BABYLON.Engine.TEXTURETYPE_FLOAT
    )
    t.name = name
    t.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
    t.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
    return t
  }
  return { position: make(pos, 'vat-pos'), normal: make(nor, 'vat-nor') }
}

/**
 * Replay a bake in the vertex shader.
 *
 * Injected into the standard material so the figures are lit like everything
 * else — see the note above about a bench that skips lighting.
 */
export class VatPlugin extends BABYLON.MaterialPluginBase {
  bake: VatBake | null = null
  /** Seconds, advanced by the owner. One uniform drives every figure. */
  time = 0
  /** `false` snaps to the nearest frame — the cheap path for a crowd. */
  interpolate = true

  constructor(material: BABYLON.Material) {
    super(material, 'Vat', 220, { VAT: false, VAT_LERP: false })
  }

  private _on = false
  get isEnabled(): boolean {
    return this._on
  }
  set isEnabled(v: boolean) {
    if (this._on === v) return
    this._on = v
    this.markAllDefinesAsDirty()
    this._enable(v)
  }

  prepareDefines(defines: Record<string, unknown>): void {
    defines.VAT = this._on
    defines.VAT_LERP = this._on && this.interpolate
  }

  getAttributes(attributes: string[]): void {
    // The vertex's own index, and the per-instance playback state. Both are
    // buffers on the mesh; neither is touched again after the crowd is built.
    attributes.push('vatIndex')
    attributes.push('vatState')
  }

  getSamplers(samplers: string[]): void {
    samplers.push('vatPos', 'vatNor')
  }

  getUniforms(): {
    ubo: Array<{ name: string; size: number; type: string }>
    vertex: string
  } {
    return {
      ubo: [
        { name: 'vatInfo', size: 4, type: 'vec4' },
        { name: 'vatTime', size: 1, type: 'float' },
      ],
      vertex: `
        uniform vec4 vatInfo;
        uniform float vatTime;
      `,
    }
  }

  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer): void {
    const b = this.bake
    if (!this._on || b == null) return
    uniformBuffer.updateFloat4(
      'vatInfo',
      b.layout.width,
      b.layout.height,
      b.layout.rowsPerFrame,
      b.layout.vertexCount
    )
    uniformBuffer.updateFloat('vatTime', this.time)
    uniformBuffer.setTexture('vatPos', b.position)
    uniformBuffer.setTexture('vatNor', b.normal)
  }

  getClassName(): string {
    return 'VatPlugin'
  }

  getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType !== 'vertex') return null
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
    }
  }
}

/* ------------------------------------------------------------------ *
 * The synthetic figure — see the note about the bench being generated.
 * ------------------------------------------------------------------ */

/** A blocky humanoid: torso, head, two arms, two legs. ~200 vertices. */
function figureParts(): Array<{
  size: [number, number, number]
  at: [number, number, number]
  /** Which limb, so the walk can swing it. `0` = still. */
  limb: number
}> {
  return [
    { size: [0.5, 0.7, 0.3], at: [0, 1.15, 0], limb: 0 },
    { size: [0.32, 0.32, 0.32], at: [0, 1.66, 0], limb: 0 },
    { size: [0.16, 0.6, 0.16], at: [-0.36, 1.2, 0], limb: 1 },
    { size: [0.16, 0.6, 0.16], at: [0.36, 1.2, 0], limb: 2 },
    { size: [0.2, 0.8, 0.2], at: [-0.15, 0.4, 0], limb: 3 },
    { size: [0.2, 0.8, 0.2], at: [0.15, 0.4, 0], limb: 4 },
  ]
}

/** Swing a limb about its top, so a leg pivots at the hip and not its middle. */
function limbSwing(limb: number, phase: number): number {
  if (limb === 0) return 0
  const t = phase * Math.PI * 2
  // Arms oppose legs, and left opposes right — which is what reads as walking.
  if (limb === 1) return Math.sin(t) * 0.5
  if (limb === 2) return -Math.sin(t) * 0.5
  if (limb === 3) return -Math.sin(t) * 0.7
  return Math.sin(t) * 0.7
}

/**
 * Build the figure mesh, and bake a walk for it.
 *
 * Returns the mesh with its `vatIndex` attribute already attached — the shader
 * needs to know which vertex it is, and WebGL1 has no `gl_VertexID`.
 */
export function buildBenchFigure(
  scene: BABYLON.Scene,
  bakeFps = 10
): { mesh: BABYLON.Mesh; bake: VatBake } {
  const parts = figureParts()
  const boxes = parts.map((p, i) => {
    const b = BABYLON.MeshBuilder.CreateBox(
      `crowd-part-${i}`,
      { width: p.size[0], height: p.size[1], depth: p.size[2] },
      scene
    )
    b.position.set(p.at[0], p.at[1], p.at[2])
    return b
  })
  const merged = BABYLON.Mesh.MergeMeshes(
    boxes,
    true,
    true,
    undefined,
    false,
    false
  )
  if (merged == null)
    throw new Error('b3d-crowd: could not build the bench figure')
  merged.name = 'crowd-figure'
  merged.isVisible = false

  const positions = merged.getVerticesData(BABYLON.VertexBuffer.PositionKind)!
  const normals = merged.getVerticesData(BABYLON.VertexBuffer.NormalKind)!
  const vertexCount = positions.length / 3

  // Which part each vertex belongs to, so the bake can swing it. Boxes merge in
  // order and each contributes 24 vertices.
  const limbOf = new Int32Array(vertexCount)
  for (let v = 0; v < vertexCount; v++) {
    limbOf[v] = parts[Math.min(parts.length - 1, Math.floor(v / 24))].limb
  }
  const pivotOf = (limb: number): number =>
    limb === 1 || limb === 2 ? 1.5 : limb >= 3 ? 0.8 : 0

  const walkFrames = framesForClip(1, bakeFps)
  const clips: VatClip[] = [
    { name: 'walk', start: 0, frames: walkFrames, duration: 1, loop: true },
  ]
  const layout = vatLayout(vertexCount, walkFrames)

  const { position, normal } = writeVatTextures(scene, layout, (v, f) => {
    const phase = f / walkFrames
    const limb = limbOf[v]
    const a = limbSwing(limb, phase)
    const px = positions[v * 3]
    const py = positions[v * 3 + 1]
    const pz = positions[v * 3 + 2]
    const nx = normals[v * 3]
    const ny = normals[v * 3 + 1]
    const nz = normals[v * 3 + 2]
    if (a === 0) return { p: [px, py, pz], n: [nx, ny, nz] }
    // Rotate about X at the limb's pivot height — a hip, not a waist.
    const pivot = pivotOf(limb)
    const dy = py - pivot
    const c = Math.cos(a)
    const s = Math.sin(a)
    return {
      p: [px, pivot + dy * c - pz * s, dy * s + pz * c],
      n: [nx, ny * c - nz * s, ny * s + nz * c],
    }
  })

  const bake: VatBake = {
    layout,
    clips,
    position,
    normal,
    bytes: vatBytes(layout),
  }

  // The vertex's own index, as an attribute. Every instance shares it.
  const index = new Float32Array(vertexCount)
  for (let v = 0; v < vertexCount; v++) index[v] = v
  merged.setVerticesData('vatIndex', index, false, 1)

  return { mesh: merged, bake }
}

/**
 * `<tosi-b3d-crowd>` — N vertex-animated figures in one draw call.
 *
 * The bench for "can we manage an army of 200 bipeds". Change `count` and watch
 * the WORST frame: an average hides the one that causes nausea.
 */
export class B3dCrowd extends B3dChild {
  static preferredTagName = 'tosi-b3d-crowd'

  static initAttributes = {
    /** How many figures. */
    count: 200,
    /** Metres across the field they scatter over. */
    spread: 60,
    /** Frames baked per second of clip — the memory knob. */
    bakeFps: 10,
    /** `'off'` snaps to the nearest frame. */
    interpolate: 'on',
  }

  declare count: number
  declare spread: number
  declare bakeFps: number
  declare interpolate: string

  private _mesh?: BABYLON.Mesh
  private _bake?: VatBake
  private _plugin?: VatPlugin
  private _obs: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null
  private _built = -1
  private _t = 0
  private _offDebug: (() => void) | null = null
  /*
  THE INSTRUMENT. A bench without one is a demo.

  Worst frame since the last reset, not an average: an average of sixty good
  frames and one 40ms frame looks fine and is nausea. `PERF-DESIGN.md`'s rule,
  and the reason the reset is a BUTTON — you want the worst since you moved the
  slider, not the worst since the page loaded, and in a headset there is no
  console to clear.
  */
  private _worstMs = 0
  private _lastMs = 0
  private _frames = 0

  /** What the bake costs on the GPU, for the readout. */
  get bakeBytes(): number {
    return this._bake?.bytes ?? 0
  }

  sceneReady(owner: B3d, scene: BABYLON.Scene): void {
    const { mesh, bake } = buildBenchFigure(scene, this.bakeFps)
    this._mesh = mesh
    this._bake = bake

    const mat = new BABYLON.StandardMaterial('crowd', scene)
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05)
    mat.diffuseColor = new BABYLON.Color3(0.62, 0.6, 0.55)
    const plugin = new VatPlugin(mat)
    plugin.bake = bake
    plugin.interpolate = this.interpolate !== 'off'
    plugin.isEnabled = true
    this._plugin = plugin
    mesh.material = mat
    mesh.isVisible = true
    // The bake already holds world-space-ish positions for the figure, and a
    // thin instance supplies the rest. Bounds must be set by hand or Babylon
    // culls the whole crowd against the ONE figure's box.
    mesh.alwaysSelectAsActiveMesh = true

    this._rebuild()
    owner.register({ meshes: [mesh] })

    this._offDebug = owner.addDebugSource({
      name: 'Crowd',
      // `mesh`, because the whole claim is that a crowd IS one mesh.
      icon: 'mesh',
      lines: () => [
        `figures ${this._built}   draws 1   verts/fig ${bake.layout.vertexCount}`,
        `frame ${this._lastMs.toFixed(1)}ms   WORST ${this._worstMs.toFixed(
          1
        )}ms`,
        `bake ${(bake.bytes / 1024 / 1024).toFixed(2)}MB  ${
          bake.layout.frameCount
        } frames  interp ${this.interpolate !== 'off' ? 'on' : 'off'}`,
        // 13.9ms is a Quest frame; 16.7 is 60Hz flat. Naming the budget beside
        // the number is what makes it a measurement rather than a readout.
        `budget 13.9ms (VR) / 16.7ms (flat)`,
      ],
      actions: [
        {
          label: 'reset worst',
          handleClick: () => {
            this._worstMs = 0
            this._frames = 0
          },
        },
      ],
    })

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
      const ms = scene.getEngine().getDeltaTime()
      this._lastMs = ms
      /*
      SKIP THE FIRST FEW. A rebuild, a shader compile and the first upload all
      land in one frame, and reporting that as the worst says the crowd is
      expensive when what was expensive was building it. The bench is about the
      STEADY state.
      */
      if (++this._frames > 10 && ms > this._worstMs) this._worstMs = ms
      // PAUSE STOPS THEM. It did not, because this clock never consulted it —
      // and a pause that leaves four thousand figures marching is not a pause.
      if (owner.paused !== true) this._t += sceneDelta(scene)
      if (this._plugin != null) this._plugin.time = this._t
      if (this._built !== Math.round(this.count)) {
        this._rebuild()
        // A change of count is a new measurement.
        this._worstMs = 0
        this._frames = 0
      }
      if (this._plugin != null) {
        const want = this.interpolate !== 'off'
        if (this._plugin.interpolate !== want) {
          this._plugin.interpolate = want
          this._plugin.markAllDefinesAsDirty()
        }
      }
    })
  }

  /**
   * Lay the crowd out and hand the GPU its per-instance state.
   *
   * Called only when the COUNT changes — never per frame. That is the whole
   * claim being measured: once built, the CPU does nothing per figure.
   */
  private _rebuild(): void {
    const mesh = this._mesh
    const bake = this._bake
    if (mesh == null || bake == null) return
    const n = Math.max(1, Math.round(this.count))
    this._built = n

    const clip = bake.clips[0]
    const matrices = new Float32Array(n * 16)
    const state = new Float32Array(n * 4)
    const m = BABYLON.Matrix.Identity()
    // A deterministic scatter — the same crowd every run, so two measurements
    // are of the same picture.
    let seed = 1
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const side = this.spread
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * side
      const z = (rnd() - 0.5) * side
      BABYLON.Matrix.RotationYToRef(rnd() * Math.PI * 2, m)
      m.setTranslationFromFloats(x, 0, z)
      m.copyToArray(matrices, i * 16)
      state[i * 4] = clip.start
      state[i * 4 + 1] = clip.frames
      // A phase OFFSET per figure, or two hundred soldiers march in lockstep —
      // which reads as a bug even though every one of them is correct.
      state[i * 4 + 2] = rnd()
      state[i * 4 + 3] = 0.7 + rnd() * 0.6 // cycles per second
    }
    mesh.thinInstanceSetBuffer('matrix', matrices, 16, true)
    mesh.thinInstanceSetBuffer('vatState', state, 4, true)
  }

  sceneDispose(): void {
    const scene = this.owner?.scene
    if (scene != null && this._obs != null) {
      scene.onBeforeRenderObservable.remove(this._obs)
    }
    this._obs = null
    this._offDebug?.()
    this._offDebug = null
    this._bake?.position.dispose()
    this._bake?.normal.dispose()
    this._mesh?.material?.dispose()
    this._mesh?.dispose()
    this._mesh = undefined
    this._bake = undefined
    this._plugin = undefined
    super.sceneDispose()
  }
}

export const b3dCrowd = B3dCrowd.elementCreator()
