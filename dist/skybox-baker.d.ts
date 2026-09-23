import * as BABYLON from '@babylonjs/core';
import { type SkyObject } from './starfield-codec.js';
/** One baked cube face: a PNG data URL plus the suffix Babylon expects. */
export interface BakedFace {
    /** `px` | `nx` | `py` | `ny` | `pz` | `nz` — the `CubeTexture` file suffix. */
    name: string;
    /** `data:image/png;base64,…` */
    url: string;
}
export interface SkyboxBakeOptions {
    /** Where the camera stands, in world space. */
    x: number;
    y: number;
    z: number;
    /**
     * Pixels per cube face. Each face is a genuine render at this size, not an
     * upscale, so it is the only knob that buys actual sky detail.
     *
     * A face covers 90°, so it is stretched across a large part of a wide
     * viewport — 512 reads as soft the moment the sky fills the screen.
     *
     * ⚠️ **The shipped sky is no longer one of these.** `/sky/default` is a 2048
     * raster and is kept for reference, but what the demos load is the PAIR that
     * {@link bakeSkyPair} produces: a 256 smooth cube for the nebulae and a
     * 1024 DATA cube for the points. 406 KB and 25 MiB, against 2.3 MB and 96 —
     * and the stars stay points at any zoom instead of being a smear baked at
     * one resolution.
     *
     * Reach for a big raster only when what you are baking is genuinely
     * low-frequency everywhere. The moment it contains points, encode the points.
     *
     * | face | VRAM (RGBA, 6 faces) |
     * | ---- | -------------------- |
     * | 512 | 6 MiB |
     * | 1024 | 24 MiB |
     * | 2048 | 96 MiB |
     * | 4096 | 384 MiB |
     *
     * ⚠️ **4096 is a desktop-only asset, and not because of the VRAM.** WebGL2
     * only guarantees `MAX_CUBE_MAP_TEXTURE_SIZE` of **2048** — a conformant
     * device may refuse a 4096 cube outright. Real hardware is usually far above
     * the floor (an M5 Max reports 16384) but a headset or a phone is exactly
     * where you would find the floor, and a sky that fails to load is a black
     * sky. Bake 4096 when you know the target; ship 2048 when you do not.
     */
    size?: number;
    /** Far plane for the capture. Must reach past whatever you are photographing. */
    maxZ?: number;
    /**
     * Things that billboard and must be aimed at the camera POSITION before the
     * capture — anything with a `facePoint(v)` method, which `b3d-galaxy` has.
     *
     * Defaults to every `<tosi-b3d-galaxy>` in the document, because forgetting
     * this is not a small mistake: leave a subject billboarding and it re-orients
     * to each face's view plane, so stars come out radially smeared and the faces
     * disagree at their seams.
     */
    subjects?: Array<{
        facePoint(t: BABYLON.Vector3 | null): void;
    }>;
    /**
     * Roll the capture basis about its Z axis, in DEGREES — where the galactic
     * band sits in the finished sky.
     *
     * Baked in rather than applied later because the whole value of an
     * interactive baker is SEEING the framing while you choose it. (The cube can
     * still be re-oriented afterwards with `b3d-skybox`'s `starfieldTilt`; this is
     * for deciding, that is for adjusting.)
     */
    roll?: number;
}
/**
 * Where to stand, given a galaxy's radius.
 *
 * ⚠️ THIS IS IN THE GALAXY'S OWN FRAME. The first bake rotated the galaxy to
 * tilt the band and then used this position unchanged, so the camera stayed
 * where it was while the disc swung away from it — the sky came out
 * photographed from well outside, looking back at the galaxy as an object.
 * Tonio: "It should be baked from INSIDE the galaxy just off the plane, vs. way
 * off to the side."
 *
 * So: either leave the subject unrotated and use this directly (what the baker
 * does), or transform it by the subject's world matrix. **Do not rotate the
 * galaxy to get a tilt** — tilt the cube where it is USED, which is free, and
 * keeps the one number that must be right about placement out of the business
 * of orientation entirely.
 */
export declare function defaultBakePose(galaxyRadius: number, outFraction?: number, offPlane?: number): {
    x: number;
    y: number;
    z: number;
};
/**
 * Bundle baked faces into ONE zip for download.
 *
 * Twelve separate browser downloads are both rude and unreliable: Chrome
 * treats a burst of automatic downloads as a permission event and silently
 * drops the rest mid-burst (observed: four of six star faces arrived). One
 * file, no prompts, nothing dropped.
 *
 * STORED, not compressed — the PNGs are already compressed, so deflating
 * again buys nothing and costs time.
 */
export declare function facesToZip(groups: Array<{
    prefix: string;
    faces: BakedFace[];
}>, zipName?: string): {
    blob: Blob;
    name: string;
};
/**
 * Photograph the scene from one point as six cube faces.
 *
 * Returns PNG data URLs in Babylon's cube order, ready to save beside each
 * other as `<root>_px.png` … `<root>_nz.png` and loaded with
 * `new CubeTexture(root, scene)`.
 */
/**
 * Pull the point-like sky out of a `<tosi-b3d-galaxy>` as encodable objects.
 *
 * Stars AND the distant galaxies, because the latter are points too — measured:
 * baking the nebula system alone at 256 versus 1024 preserves energy and
 * bright-area almost exactly and loses only PEAK, and peak is what a point is.
 * The nebulae stay behind for the smooth cube, which is all they ever needed.
 *
 * The distant galaxies come through the galaxy's own accessor rather than a
 * size cut over the nebula system — at scale 3–9 they overlap the local
 * nebulae (2.25–7.5), so "small" would sweep in most of the nebulae along with
 * them. At the default 10k galaxy that was 1,400 extra discs in the cube; at
 * 100k it is fourteen thousand, crowding the cube and displacing real stars.
 * The data model knows which is which — ask it.
 *
 * Stars join the star DATA by particle index (the SPS builds one particle per
 * star, in order — the same alignment `hideStarAt` relies on). Two reasons,
 * both measured rather than assumed:
 *
 * - **Colour from the SPECTRAL CLASS, not the rgb.** A star's colour follows
 *   its class, so `palette: spectralPaletteIndex(spectralType)` is what the
 *   encoder stores — nearest-matching the particle's rgb made every star land
 *   in the near-white palette entries, which is exactly the "bright white
 *   dots, no colour" sky Tonio called out.
 * - **Brightness from the AUTHORED scale, not the clamped particle size.**
 *   `b3d-galaxy` clamps a star's apparent size (`maxStarApparentSize`), and at
 *   bake distance the clamp bit most of the population — the particle scales
 *   were nearly uniform, so the encoded magnitudes were too, and the display
 *   curve had no gradient to show. `StarData.scale` is derived from
 *   luminosity before any clamping, so the real magnitude range survives.
 */
export declare function starsFromGalaxy(galaxy: {
    starSps?: {
        particles: BABYLON.SolidParticle[];
    } | null;
    getDistantGalaxyParticles?: () => BABYLON.SolidParticle[] | null;
    getDistantStarParticles?: () => BABYLON.SolidParticle[] | null;
    getGalaxyData?: () => {
        stars: Array<{
            spectralType: string;
            scale: number;
        }>;
    } | null;
}, eye: {
    x: number;
    y: number;
    z: number;
}, options?: {
    galaxyMaxScale?: number;
}): SkyObject[];
/**
 * Encoded faces → PNG data URLs, ready to save beside a skybox.
 *
 * ⚠️ **PNG, and it must stay PNG — but that is only half the rule.** These are
 * packed fields, not pictures, and a lossy codec would quantise a sub-texel
 * position into a different position and a brightness into a different star.
 * JPEG here would not look slightly worse, it would move the sky.
 *
 * The other half is that the PNG must not pass through a CANVAS. The canvas 2D
 * backing store is premultiplied, and a star's alpha byte is a palette index
 * (0..9) rather than an opacity — so `putImageData` rounds the RGB of every
 * low-alpha texel toward zero, `toDataURL` faithfully saves the destruction,
 * and the shader decodes a sky with its faint stars silently deleted.
 * Measured against the real 100k-star galaxy before this was written: 67% of
 * one face's occupied texels corrupted or gone, positions snapped to 0/255,
 * before any compression question arose. `pngEncode` writes the bytes
 * directly; a texel with alpha 0 and nonzero RGB survives exactly.
 */
export declare function facesToPngs(faces: Uint8Array[], size: number): Promise<BakedFace[]>;
/**
 * Bake a galaxy into the PAIR of cubes the sky wants: a small smooth one for
 * the nebulae and a data one for the points.
 *
 * The two are separate because they are different KINDS of thing, measured
 * rather than assumed — see `starfield-codec`. The smooth half is
 * low-frequency and survives 256; the points need position, not pixels.
 */
export declare function bakeSkyPair(scene: BABYLON.Scene, galaxy: {
    starMesh?: BABYLON.AbstractMesh | null;
    starSps?: {
        particles: BABYLON.SolidParticle[];
    } | null;
    nebulaSps?: {
        particles: BABYLON.SolidParticle[];
    } | null;
}, options: SkyboxBakeOptions & {
    dataSize?: number;
    smoothSize?: number;
}): Promise<{
    smooth: BakedFace[];
    data: BakedFace[];
    placed: number;
    lost: number;
}>;
export declare function bakeSkyboxCube(scene: BABYLON.Scene, options: SkyboxBakeOptions): Promise<BakedFace[]>;
//# sourceMappingURL=skybox-baker.d.ts.map