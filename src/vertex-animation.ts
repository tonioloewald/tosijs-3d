/*#
# vertex-animation

**Animation baked into a texture, replayed in the vertex shader.** Pure — no
Babylon, no GPU — so the layout and the phase maths can be tested without a
renderer.

The substrate for things there are MANY of — and, now the numbers are in, mostly
NOT for armies. A whole miniatures battle is ~270 figures against 200,000
measured at 33ms, so the place this earns its keep is **flocks of birds, swarms
of insects, shoals, herds, a field of fauna, a bed of carnivorous plants**.
Tonio: *"we have a fallback to handle things like flocks of birds flying around
in the background, or swarms of insects etc. It's very nice to have, and we
should definitely keep the infrastructure we built."*

Not a cheaper biped — a different primitive. A skinned `b3d-biped` carries a skeleton, an `AnimationGroup`, a
collision ellipsoid, a camera rig and two thousand lines of per-instance
JavaScript. At two hundred of them the question is not which part is slow.

A vertex-animated figure has none of it. Positions for every frame live in a
texture, the vertex shader samples the row for "now", and what varies per
instance is three numbers — which clip, what phase, how fast. So N figures are
one mesh, one material, one draw call, and no per-instance work on the CPU at
all.

## It is the MD2 idea, with the frames on the GPU

Tonio: *"another option would actually be doing it with vertex shaders driving
md2 style mesh deformation… The original game used tiny bitmap animation frames
and each figure had only two or three states. I'd like to be less crude than
that but there's a lot of ground between that and a fully articulated biped."*

That ground is this. Quake II shipped vertex keyframes with linear interpolation
between them in 1997; the only thing that has changed is that the keyframes fit
in a texture and the interpolation is free.

## Two things get called blending, and they are different

| | fixes | cost |
| --- | --- | --- |
| **frame interpolation** | jerkiness INSIDE a clip | 2 samples instead of 1 |
| **clip blending** | the pop when walk becomes run | 4 samples |

Frame interpolation is the one that matters for wildlife, and it pays for itself
twice: with it on you can bake at a LOW frame rate and still look smooth, which
is the direct answer to the memory arithmetic below. Bake a bird at 30fps with
interpolation; bake a soldier at 10fps without. Tonio: *"I don't really care if
my 200 soldiers are a little jerky."* So it is a per-asset choice, and the crowd
pays nothing for the wildlife's smoothness.

## The bake is the LOD

"Can we algorithmically produce a lower resolution set of animations?" — with
this, that question dissolves. Decimate the mesh and re-bake against the same
clip table. The derivation is an offline pipeline step (where `static-assets`
already drives conversion from `metadata.json`), not a runtime system: cacheable,
inspectable, and free at 60fps. Fewer joints is not a thing you can ask for
because there are no joints; fewer VERTICES and fewer FRAMES are, and both are
just numbers you bake at.

## What you give up

No skeleton means no bone to hang a helmet on. The answer is to bake a handful
of **socket** transforms per frame alongside the vertices — see `SocketLayout` —
so equipment rides as its own instanced mesh sampling the same frame. Two
hundred soldiers in two hundred helmets carrying two hundred spears stays three
draw calls.

The other cost is real and worth stating: a figure that is promoted to a named
character has to cross from here to a skinned rig. That seam should be designed,
not discovered.
*/
/*{ "parent": "Performance", "order": 118 }*/

/**
 * One animation in a baked set.
 *
 * `start` and `frames` index the WHOLE bake, so several clips share one texture
 * and switching clip is a change of offset rather than a change of material.
 */
export interface VatClip {
  name: string
  /** First frame of this clip within the bake. */
  start: number
  /** How many frames it occupies. */
  frames: number
  /** Seconds the clip takes at normal speed. */
  duration: number
  /** Does it wrap, or hold its last frame? */
  loop?: boolean
}

/** How the bake is arranged in the texture. */
export interface VatLayout {
  vertexCount: number
  /** Total frames across every clip. */
  frameCount: number
  /** Texel width — vertices run across, wrapping onto `rowsPerFrame` rows. */
  width: number
  /** Rows one frame occupies. `1` unless the mesh is wider than `width`. */
  rowsPerFrame: number
  /** Texel height — `frameCount · rowsPerFrame`. */
  height: number
}

/**
 * Plan a texture for a bake.
 *
 * A mesh with more vertices than the texture is wide WRAPS onto extra rows
 * rather than failing: `maxWidth` is a hardware limit (2048 is safe everywhere,
 * including the Quest), and a 3000-vertex figure is a perfectly reasonable
 * thing to ask for. The shader recovers the texel from a vertex index either
 * way, so wrapping costs nothing but arithmetic.
 */
export function vatLayout(
  vertexCount: number,
  frameCount: number,
  maxWidth = 2048
): VatLayout {
  const verts = Math.max(0, Math.floor(vertexCount))
  const frames = Math.max(0, Math.floor(frameCount))
  const width = Math.max(1, Math.min(verts || 1, maxWidth))
  const rowsPerFrame = Math.max(1, Math.ceil(verts / width))
  return {
    vertexCount: verts,
    frameCount: frames,
    width,
    rowsPerFrame,
    height: frames * rowsPerFrame,
  }
}

/**
 * Where one vertex of one frame lives, in TEXELS (not normalised).
 *
 * Integer texel coordinates on purpose: the shader must sample the exact texel
 * with no filtering across neighbours, and a half-texel offset is the classic
 * way to get a figure whose vertices are each fractionally somebody else's.
 * Normalising is the caller's job, with that half-texel added.
 */
export function vatTexel(
  layout: VatLayout,
  vertexIndex: number,
  frame: number
): { x: number; y: number } {
  const v = Math.max(
    0,
    Math.min(layout.vertexCount - 1, Math.floor(vertexIndex))
  )
  const f = Math.max(
    0,
    Math.min(Math.max(0, layout.frameCount - 1), Math.floor(frame))
  )
  return {
    x: v % layout.width,
    y: f * layout.rowsPerFrame + Math.floor(v / layout.width),
  }
}

/** The two frames to sample and how far between them. */
export interface FramePair {
  /** Absolute frame index within the bake. */
  a: number
  b: number
  /** `0` at `a`, `1` at `b`. */
  t: number
}

/**
 * Which frames "now" falls between, for a clip playing at `phase`.
 *
 * `phase` is normalised progress through the clip — `0.5` is halfway, whatever
 * the clip's duration or frame count. Feeding normalised progress rather than
 * seconds is what lets one instanced buffer drive figures playing different
 * clips at different speeds: the shader never needs to know how long anything
 * takes.
 *
 * A LOOPING clip wraps from its last frame back to its first, so the seam is
 * interpolated like any other and a walk cycle does not hitch once per stride.
 * A one-shot clip holds its last frame instead — a death that loops is a
 * different kind of bug.
 */
export function framePair(clip: VatClip, phase: number): FramePair {
  const frames = Math.max(1, Math.floor(clip.frames))
  if (!Number.isFinite(phase)) return { a: clip.start, b: clip.start, t: 0 }
  if (frames === 1) return { a: clip.start, b: clip.start, t: 0 }

  if (clip.loop === true) {
    // Wrapped: `frames` steps around a ring, so frame N-1 blends back into 0.
    const p = phase - Math.floor(phase)
    const scaled = p * frames
    const i = Math.floor(scaled) % frames
    return {
      a: clip.start + i,
      b: clip.start + ((i + 1) % frames),
      t: scaled - Math.floor(scaled),
    }
  }

  // One-shot: clamped, and it HOLDS the last frame rather than wrapping.
  const p = phase < 0 ? 0 : phase > 1 ? 1 : phase
  const scaled = p * (frames - 1)
  const i = Math.min(frames - 2, Math.floor(scaled))
  return { a: clip.start + i, b: clip.start + i + 1, t: scaled - i }
}

/** Normalised progress through a clip after `seconds`, at `speed`. */
export function phaseAt(clip: VatClip, seconds: number, speed = 1): number {
  const d = clip.duration > 0 ? clip.duration : 1
  const p = (seconds * speed) / d
  if (!Number.isFinite(p)) return 0
  return clip.loop === true ? p - Math.floor(p) : p < 0 ? 0 : p > 1 ? 1 : p
}

/**
 * How many frames a clip needs at a given bake rate — at least two, or there is
 * nothing to interpolate between.
 *
 * The knob that trades memory for smoothness, and the reason a low rate is
 * viable at all: with frame interpolation on, 10fps of baked walk reads as
 * motion rather than as slides.
 */
export function framesForClip(durationSeconds: number, fps: number): number {
  if (!(durationSeconds > 0) || !(fps > 0)) return 1
  return Math.max(2, Math.ceil(durationSeconds * fps))
}

/**
 * Bytes a bake occupies on the GPU.
 *
 * Worth having as a function rather than a rule of thumb, because the answer
 * decides the design: ~500 vertices at 60 frames is half a megabyte and nobody
 * cares, while 5000 vertices at 300 frames is 28MB and somebody very much does.
 * `channels` is 4 for RGBA; `bytesPerChannel` is 2 for half-float, which is the
 * right default — positions in a mesh's own bounding box do not need 32 bits,
 * and half the bandwidth is half the bandwidth.
 */
export function vatBytes(
  layout: VatLayout,
  textures = 2,
  channels = 4,
  bytesPerChannel = 2
): number {
  return (
    layout.width *
    layout.height *
    channels *
    bytesPerChannel *
    Math.max(1, textures)
  )
}

/**
 * Where equipment rides, since there are no bones to hang it from.
 *
 * A small second texture: one texel per socket per frame, holding the socket's
 * position (and, in a sibling texel, its orientation). A helmet is then its own
 * thin-instanced mesh sampling the same frame and phase as the figure wearing
 * it — so an army in helmets carrying spears is three draw calls, not six
 * hundred.
 *
 * Kept deliberately small. Sockets are `head`, `handR`, `handL`, `back` — the
 * places things actually attach — and not a skeleton by the back door. If a
 * figure needs more than a handful of attachment points it wants a skeleton,
 * and that is the seam to the named-character path rather than a reason to grow
 * this one.
 */
export interface SocketLayout {
  names: readonly string[]
  frameCount: number
  /** Texels per socket per frame — 2: position, then orientation. */
  texelsPerSocket: number
  width: number
  height: number
}

export function socketLayout(
  names: readonly string[],
  frameCount: number,
  texelsPerSocket = 2
): SocketLayout {
  return {
    names,
    frameCount: Math.max(0, Math.floor(frameCount)),
    texelsPerSocket,
    width: Math.max(1, names.length * texelsPerSocket),
    height: Math.max(0, Math.floor(frameCount)),
  }
}

/** Where a socket's data sits for a frame, in texels. */
export function socketTexel(
  layout: SocketLayout,
  socket: string,
  frame: number,
  channel = 0
): { x: number; y: number } | null {
  const i = layout.names.indexOf(socket)
  if (i < 0) return null
  const f = Math.max(
    0,
    Math.min(Math.max(0, layout.frameCount - 1), Math.floor(frame))
  )
  return {
    x:
      i * layout.texelsPerSocket +
      Math.max(0, Math.min(layout.texelsPerSocket - 1, channel)),
    y: f,
  }
}
