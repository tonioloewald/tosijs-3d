/**
 * One animation in a baked set.
 *
 * `start` and `frames` index the WHOLE bake, so several clips share one texture
 * and switching clip is a change of offset rather than a change of material.
 */
export interface VatClip {
    name: string;
    /** First frame of this clip within the bake. */
    start: number;
    /** How many frames it occupies. */
    frames: number;
    /** Seconds the clip takes at normal speed. */
    duration: number;
    /** Does it wrap, or hold its last frame? */
    loop?: boolean;
}
/** How the bake is arranged in the texture. */
export interface VatLayout {
    vertexCount: number;
    /** Total frames across every clip. */
    frameCount: number;
    /** Texel width — vertices run across, wrapping onto `rowsPerFrame` rows. */
    width: number;
    /** Rows one frame occupies. `1` unless the mesh is wider than `width`. */
    rowsPerFrame: number;
    /** Texel height — `frameCount · rowsPerFrame`. */
    height: number;
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
export declare function vatLayout(vertexCount: number, frameCount: number, maxWidth?: number): VatLayout;
/**
 * Where one vertex of one frame lives, in TEXELS (not normalised).
 *
 * Integer texel coordinates on purpose: the shader must sample the exact texel
 * with no filtering across neighbours, and a half-texel offset is the classic
 * way to get a figure whose vertices are each fractionally somebody else's.
 * Normalising is the caller's job, with that half-texel added.
 */
export declare function vatTexel(layout: VatLayout, vertexIndex: number, frame: number): {
    x: number;
    y: number;
};
/** The two frames to sample and how far between them. */
export interface FramePair {
    /** Absolute frame index within the bake. */
    a: number;
    b: number;
    /** `0` at `a`, `1` at `b`. */
    t: number;
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
export declare function framePair(clip: VatClip, phase: number): FramePair;
/** Normalised progress through a clip after `seconds`, at `speed`. */
export declare function phaseAt(clip: VatClip, seconds: number, speed?: number): number;
/**
 * How many frames a clip needs at a given bake rate — at least two, or there is
 * nothing to interpolate between.
 *
 * The knob that trades memory for smoothness, and the reason a low rate is
 * viable at all: with frame interpolation on, 10fps of baked walk reads as
 * motion rather than as slides.
 */
export declare function framesForClip(durationSeconds: number, fps: number): number;
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
export declare function vatBytes(layout: VatLayout, textures?: number, channels?: number, bytesPerChannel?: number): number;
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
    names: readonly string[];
    frameCount: number;
    /** Texels per socket per frame — 2: position, then orientation. */
    texelsPerSocket: number;
    width: number;
    height: number;
}
export declare function socketLayout(names: readonly string[], frameCount: number, texelsPerSocket?: number): SocketLayout;
/** Where a socket's data sits for a frame, in texels. */
export declare function socketTexel(layout: SocketLayout, socket: string, frame: number, channel?: number): {
    x: number;
    y: number;
} | null;
//# sourceMappingURL=vertex-animation.d.ts.map