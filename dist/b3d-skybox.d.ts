import * as BABYLON from '@babylonjs/core';
import '@babylonjs/materials/sky/sky.vertex.js';
import '@babylonjs/materials/sky/sky.fragment.js';
import { AbstractMesh } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dSkybox extends AbstractMesh {
    /** Whether the sky is on OUR shader — the starfield and the veil need it. */
    private _forkedSky;
    private _veilColor;
    static preferredTagName: string;
    static initAttributes: {
        turbidity: number;
        spaceStart: number;
        spaceFull: number;
        /**
         * A BAKED cube map behind the sky — the root path of six files named
         * `<root>_px.png` … `<root>_nz.png` (see [skybox-baker](?skybox-baker.ts)).
         *
         * When set it replaces the procedural `starfield` entirely, because it is
         * the same job done properly: real star positions photographed from a real
         * system, with structure no scattering of points will reproduce.
         */
        starfieldCube: string;
        /**
         * Root path of a DATA cube (`<root>_px.png` …) encoded by
         * [starfield-codec](?starfield-codec.ts).
         *
         * Not a picture of a starfield — a table of stars, decoded in the shader
         * into points that stay sharp at any field of view. Costs a 512 cube where
         * the rastered equivalent wanted 2048, and does not blur when you zoom.
         *
         * Composes with `starfieldCube` rather than replacing it: put the smooth
         * half (nebulae, band glow) in a small raster and the point-like half here,
         * which is the split the measurements argued for.
         */
        starfieldData: string;
        /**
         * Texels per face of `starfieldData`. Must match what encoded it.
         *
         * 1024 is the size to ship. At 512 a crowded texel's quarter-texel packed
         * position becomes a visible lattice through the dense band once a texel
         * spans several screen pixels — see `PACKED_CAPACITY`.
         */
        starfieldDataSize: number;
        /**
         * How sharp a decoded point is — higher is tighter.
         *
         * Tuned by looking, three times: 2.2 draws stars about a pixel across,
         * which read as points — but a bright star's gaussian tail stays visible
         * well past the core, so on a real screen they still read as soft blobs.
         * 3 tucks the tail in. At 1 the sky reads soft-focus.
         */
        starfieldSharpness: number;
        /** How much bigger a full-size object (a distant galaxy) is than a star. */
        starfieldSizeScale: number;
        /**
         * Roll/pitch/yaw applied to `starfieldCube`, in DEGREES, as `'rx,ry,rz'`.
         *
         * This is where a galactic tilt belongs. Rotating the GALAXY to get one
         * moves it out from under the bake camera; rotating the cube costs nothing,
         * is changeable after the fact, and can differ per system from one baked
         * texture.
         */
        starfieldTilt: string;
        starfield: number;
        /**
         * Soft emission clouds behind the stars — a count, `0` = none. They are
         * what stops a starfield reading as pepper on black.
         */
        nebulae: number;
        /** Nebula brightness 0…1. */
        nebulaBrightness: number;
        nebulaSize: number;
        /**
         * Image stamped for each nebula — black-backed, since it is composited
         * ADDITIVELY and the black is what makes the silhouette. Empty falls back
         * to a procedural falloff, which is a poor substitute: this repo ships
         * `/nebula.png`, and a consumer should point this at their own.
         */
        nebulaTexture: string;
        spaceColor: string;
        /** Seed for `starfield`. Same seed, same constellations. */
        starfieldSeed: number;
        /**
         * Where a `<tosi-b3d-star>` child gets parked along the sun vector. `0`
         * leaves it wherever the author put it. Apparent size is `radius /
         * starDistance`, and that is deliberately the author's arithmetic rather
         * than ours — see the note in updateSky.
         */
        starDistance: number;
        luminance: number;
        azimuth: number;
        latitude: number;
        realtimeScale: number;
        updateFrequencyMs: number;
        sunColor: string;
        duskColor: string;
        moonColor: string;
        moonIntensity: number;
        timeOfDay: number;
        rayleigh: number;
        mieDirectionalG: number;
        mieCoefficient: number;
        skyboxSize: number;
        applyFog: boolean;
        x: number;
        y: number;
        z: number;
        rx: number;
        ry: number;
        rz: number;
        axes: boolean;
    };
    private interval;
    private _sizeToCamera;
    private _lastSkyTime;
    private _sunApplied;
    private _sunWaitFrames;
    private sunEl;
    private _horizonColor;
    private _sunVec;
    private _dir;
    private _qLat;
    private _qTime;
    private _qTotal;
    private _horizonScratch;
    /** The sun's (or moon's) colour this hour — the light takes it when there is one. */
    private _lightColor;
    private _duskScratch;
    private _colorCache;
    /** Approximate horizon color based on current time of day / atmosphere. */
    get horizonColor(): BABYLON.Color3;
    private hex;
    /** 0 in the troposphere, 1 in vacuum. See `spaceStart`/`spaceFull`. */
    private _vacuum;
    private _glowExcluded;
    /**
     * NEBULAE — off by default, and honestly a dead end in this form.
     *
     * ⚠️ A STAMPED SPRITE CANNOT BE A NEBULA. The texture is a round blob, so
     * every stamp is a circle; squashing and rolling it varies the outline but
     * not the fact of it. Tonio, after several passes of tuning: "This isn't from
     * overlaps. Each nebular is a single squashed circle and looks wrong."
     *
     * And the two requirements fight. Structure only reads when a stamp is LARGE,
     * while a field only reads when the stamps are small and many — at which
     * point each one is a few pixels across, mips average the turbulence flat,
     * and you are back to a smooth disc. There is no count/size that satisfies
     * both, which is why tuning kept producing a different wrong answer.
     *
     * `b3d-galaxy` does not have this problem because its nebulae are not
     * sprites: the fragment shader runs fbm per particle with a per-particle seed
     * and distorts the falloff with it, so no two are the same shape. That is the
     * approach to port if this is ever worth doing here — or, better, skip it
     * entirely and BAKE THE GALAXY, which is the agreed direction and gets real
     * structure plus real stars in one step.
     *
     * Kept, off, and cheap: a no-dependency fallback for a scene with no galaxy.
     */
    /**
     * (Implementation note) What stops a starfield reading as pepper on black.
     *
     * Quads, not points, because a nebula is an EXTENT. They need no billboarding
     * despite always facing you: the camera sits at the centre of this sphere and
     * only ever rotates, so a quad built facing the centre faces the viewer
     * forever. Per-frame billboarding would buy precisely nothing — the same
     * reason the stars are points and the same reason none of this backdrop is
     * rebuilt after the first frame.
     *
     * Additive and soft-edged, like everything else in the sky: emission cannot
     * darken what is behind it, and two overlapping nebulae should pool rather
     * than occlude.
     */
    private _buildNebulae;
    private _excludeFromGlow;
    private _starfieldMesh;
    private _clearBase;
    private _starCube;
    private _starData;
    private _starTilt;
    /** The tilt as a quaternion — the dome's rotation is composed from it. */
    private _tiltQuat;
    private _domeQuat;
    /** Where the moon sits in the dome's frame — see updateSky. */
    private _moonLocal;
    private _nebulaMeshes;
    private _nebulaMats;
    private _nebulaBase;
    private starEl;
    /**
     * The background starfield — built ONCE, then never touched.
     *
     * Points, not billboards: a star is a point source and there is nothing to
     * face. `b3d-galaxy` re-billboards its whole particle system every frame,
     * which is right for a galaxy you orbit and would be pure waste for a sky
     * that cannot change. Parented to the dome so it inherits the per-frame
     * camera pinning and rescaling for free.
     *
     * Colour follows the spectral sequence (cool red → hot blue) with most stars
     * dim, because a sky of uniformly bright white dots reads as static. The
     * brightness curve is `u^3`, which is not physics but does put a handful of
     * bright stars among many faint ones, which is what the eye is looking for.
     */
    private _buildStarfield;
    private _removeFogLayer;
    /**
     * How far out of the atmosphere the VIEWER is — the camera, not the skybox,
     * which is pinned to the camera anyway. Read live rather than cached because
     * the thing that moves is someone else's mesh.
     */
    private _vacuumNow;
    /**
     * Hide the sky behind whatever medium you are standing in.
     *
     * The colour is the scene's own composited fog, so the sky and the air in
     * front of it are the same white by construction — there is no second place
     * to tune and nothing to keep in step. See `B3d.fogVeil` for why this is a
     * different number from the fog's own weight.
     */
    private _applyVeil;
    private updateSky;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    render(): void;
}
export declare const b3dSkybox: import("tosijs").ElementCreator<B3dSkybox>;
//# sourceMappingURL=b3d-skybox.d.ts.map