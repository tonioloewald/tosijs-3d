import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import type { B3d } from './tosi-b3d.js';
export declare class B3dCloudDeck extends B3dChild {
    static initAttributes: {
        altitude: number;
        /**
         * World extent of the deck. BIG — it has to reach the horizon, and a flat
         * grid is nearly free. See "The rim fades out".
         */
        size: number;
        subdivisions: number;
        /**
         * Clear `0` → solid `1` → THICKENING, up to `2`.
         *
         * Past 1 there is no more sky left to cover, so the extra goes into DEPTH:
         * the base descends toward the ground while the top stays put. See
         * "Coverage past 1 is thickness".
         */
        coverage: number;
        /**
         * MAXIMUM thickening: how far the cloud TOP stands above `altitude` at
         * `coverage: 2`, in metres.
         *
         * This is the cap, and the dial reaches it only at the very top of its
         * travel — see `thickening` for the easing. A thunderhead is several
         * kilometres tall, so there is a lot of room above the default here.
         */
        thickenDepth: number;
        seed: number;
        frequency: number;
        /** Rounded heaps `0` → long wispy streaks at `±1` — positive ALONG the wind heading, negative ACROSS it. Rebakes the field. */
        cirrus: number;
        /** Metres per second the deck drifts. The whole sky slides; nothing rebakes. */
        wind: number;
        /** Which way it drifts. Also the direction cirrus streaks run. */
        windHeadingDeg: number;
        /**
         * How fast cloud shapes change, `0` rigid → `1` restless. A second sample
         * of the same field sliding at a different rate — see the shader note.
         */
        evolve: number;
        /**
         * Keep the deck centred under the camera: `'on'` or `'off'`.
         *
         * ON by default, because a deck is finite and the world is not. The field
         * is sampled in WORLD XZ, so sliding the disc along does not slide the
         * weather — the clouds stay where they are and the sheet moves under them.
         * Turn it off only for a scene small enough that `size` covers it.
         */
        follow: string;
        /**
         * How far a local weather field can lift the cloud top, in metres.
         *
         * The bulge is `weather(x, z) × localRise`, added to whatever the global
         * `coverage` thickening is already doing — so a province towers ABOVE an
         * overcast rather than instead of it.
         *
         * Large, because the OROGRAPHIC field is deliberately attenuated: it is
         * smoothed at massif scale, so a lone summit peaks around 0.2 and only a
         * whole range of high ground approaches 1. That attenuation is the physics
         * — one peak does not build a thunderhead — so the amplitude belongs here
         * rather than in a blur that lies about the shape. An authored `weather`
         * province returning 1 gets the full height.
         */
        localRise: number;
        /**
         * How much a unit of local weather adds to `coverage`.
         *
         * This is what the field does BELOW an overcast: high ground makes more
         * cloud, not a taller lump of it. It needs no upper switch because it
         * cancels itself — at full cover the threshold is already saturated, so the
         * boost changes nothing and the field goes back to driving height.
         */
        localCoverage: number;
        /**
         * Orographic cloud, `0…1`: how strongly cloud gathers over high ground.
         *
         * Needs a `<tosi-b3d-terrain>` in the scene; it asks that terrain for its
         * own height sampler, so the cloud is built over the ground that is
         * actually there — landforms, provinces, slider changes and all — rather
         * than over a second guess at it.
         */
        orographic: number;
        /** Terrain height, in metres, at which `orographic` cloud is at full strength. */
        orographicPeak: number;
        /** Cloud shadows on the ground: `'on'` or `'off'`. */
        shadows: string;
        /**
         * Shadow texture resolution. `0` resolves from the device tier.
         *
         * Fractional by nature — a cloud shadow is a soft, low-frequency cue, so it
         * is rendered far coarser than the cloud that casts it and nobody can tell.
         */
        shadowResolution: number;
        /**
         * Width of the shadow window in metres, centred on the camera.
         *
         * A WINDOW rather than a tiling texture, so the wind can blow in any
         * direction without seams — see the note on `SHADOW_FRAG`.
         */
        shadowRange: number;
        /**
         * `transmission` below which the AMBIENT fill starts to go, `0` to disable.
         *
         * The ambient goes FIRST and the sun goes second — see `_applyGloom`.
         */
        ambientGloomBelow: number;
        /** How far the ambient may be taken down, `0…1`. */
        ambientGloom: number;
        /**
         * `transmission` below which the SUN starts to go, `0` to disable.
         *
         * Later than the ambient, deliberately: by the time the key light is being
         * removed the fill has already flattened the scene, so the world dims
         * before it goes sunless rather than both at once.
         */
        sunGloomBelow: number;
        /** How far the sun may be taken down at zero transmission, `0…1`. */
        sunGloom: number;
        /**
         * How dark a fully-clouded patch makes the ground at ZERO transmission,
         * `0…1`. What actually reaches the ground is this scaled by how much light
         * the cloud lets through — see `_syncShadows`.
         */
        shadowStrength: number;
        /**
         * How much daylight comes THROUGH from above: `0` storm-dark underside,
         * `1` glowing. `-1` derives it from `coverage`, which is the honest default
         * — a thin sky transmits and an overcast one does not.
         */
        transmission: number;
        /**
         * Vertical extent of the whiteout. The geometry stays a surface; this is
         * how far either side of it counts as being inside the cloud.
         *
         * Deep enough to pass THROUGH rather than across — see "You must never see
         * it edge-on" — and no deeper. It is a cloud, not a climate.
         *
         * This is the depth at FULL coverage; thinner skies scale it down, so the
         * whiteout is always there and its LENGTH is what the weather decides.
         */
        thickness: number;
        /**
         * Haze under the deck, `0…1`: how much the air below an overcast is the
         * cloud's own colour. What it buys is the deck's RIM — a 4 km plane has an
         * edge, and fog is what a real sky uses to hide it.
         */
        haze: number;
        /** Octaves of detail in the baked field. Billow needs more than fBm. */
        octaves: number;
        fieldSize: number;
        /**
         * Metres per repeat of the field — the size of the CLOUDS, not of the deck.
         *
         * Big, because these are weather-system features seen from kilometres away,
         * not puffs seen from a garden. It is no longer a visible rhythm either:
         * the two sampling layers are at an irrational scale ratio, so nothing
         * realigns — see the shader note.
         */
        period: number;
        /**
         * Where the radial fade begins, as a fraction of the half-size. Below this
         * the deck is solid; beyond it, it thins to nothing before the rim.
         */
        edgeFade: number;
        color: string;
        underColor: string;
        /** Brightness of the lit edges seen from below — ADDED, so it can exceed 1. */
        fringe: number;
        /** Strength of the faux bump normal. Higher = more pronounced relief. */
        bump: number;
        /**
         * How much relief the UNDERSIDE shows, `0…1`. The lobes are shaped by the
         * same bumps the top is lit by — see the shader note.
         */
        underBump: number;
        /** How much of the top's brightness the lighting may take. SMALL on purpose. */
        shade: number;
    };
    altitude: number;
    size: number;
    subdivisions: number;
    coverage: number;
    thickenDepth: number;
    seed: number;
    frequency: number;
    cirrus: number;
    wind: number;
    windHeadingDeg: number;
    evolve: number;
    follow: string;
    localRise: number;
    localCoverage: number;
    orographic: number;
    orographicPeak: number;
    shadows: string;
    shadowResolution: number;
    shadowRange: number;
    shadowStrength: number;
    ambientGloomBelow: number;
    ambientGloom: number;
    sunGloomBelow: number;
    sunGloom: number;
    transmission: number;
    thickness: number;
    haze: number;
    octaves: number;
    fieldSize: number;
    period: number;
    edgeFade: number;
    color: string;
    underColor: string;
    fringe: number;
    bump: number;
    underBump: number;
    shade: number;
    mesh?: BABYLON.Mesh;
    /** The cloud TOP, shown only when `coverage` past 1 has separated it. */
    topMesh?: BABYLON.Mesh;
    /** The baked density field — the thing a shadow decal should also sample. */
    fieldTexture?: BABYLON.RawTexture;
    private _obs;
    private _field;
    private _fieldSize;
    private _bakeKey;
    private _elapsed;
    private _weatherKey;
    /** The field the last bake built — what `_immersionAt` samples. */
    private _liveWeather;
    private _terrain;
    /** The scene's terrain, looked up once — re-queried only while absent or gone. */
    private _terrainEl;
    private _weatherMax;
    private _weatherTex;
    private _weatherTexSize;
    private _originX;
    private _originZ;
    private _onShift;
    private _driftX;
    private _driftZ;
    private _driftX2;
    private _driftZ2;
    /** The shadow half — see `_syncShadows`. Null when `shadows` is off. */
    private _shadowMap;
    private _shadowTex;
    private _tint;
    private _borrowed;
    private _onAddition;
    /**
     * Attach the shadow hook, if this mesh can actually wear one.
     *
     * The filter is not tidiness. `MaterialPluginBase` attaches happily to ANY
     * material and then silently does nothing on the ones that never route plugin
     * events — every `@babylonjs/materials` material, and our own ShaderMaterials
     * (see UPSTREAM.md). So attaching to the sky, or to this very deck, costs a
     * live plugin instance that can never fire and, worse, reads as "wired up"
     * to anyone checking.
     */
    private _maybeReceive;
    private _immersion;
    private _removeFogLayer;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    /** Push the live dials at the shader. Cheap enough to do every frame. */
    private _sync;
    /**
     * Bake (or re-bake) the density field.
     *
     * SEPARATE FROM SETUP, because the bake inputs are attributes and an
     * attribute that silently does nothing is worse than one that does not exist.
     * `cirrus` is the case that made this obvious: the slider moved, the element
     * accepted the value, and the sky did not change — because the field had been
     * baked once in `sceneReady` and nothing ever asked for another.
     *
     * Only the BAKE inputs live here. `coverage` and the colours are uniforms and
     * must stay that way: weather is a live dial, and nothing should regenerate
     * when it moves.
     */
    private _bakeField;
    /**
     * LOCAL weather: `(x, z) → 0…1`, in logical world coordinates.
     *
     * WHAT IT DOES depends on how full the sky already is, and that is the whole
     * design rather than a special case:
     *
     * - **Below full cover** it adds to `coverage` (`localCoverage`). High ground
     *   makes MORE cloud, not a taller lump of it — which is what orographic
     *   cloud looks like under a broken sky, and it keeps the single sheet flat
     *   so it is never caught edge-on.
     * - **Above full cover** it adds HEIGHT (`localRise`), on the same none-at-1
     *   to maximum-at-2 ramp the global thickening rides. There is no more sky to
     *   cover, so the same field starts building upward instead.
     *
     * The handover needs no switch: the coverage boost cancels itself exactly
     * where it stops meaning anything, because a saturated threshold cannot be
     * saturated further.
     *
     * Set it to a province falloff for an authored thunderhead, or leave it null
     * and set `orographic` to have the deck build one from the terrain. Sampled
     * per vertex, so its resolution is the grid's: at the default 14 km over 64
     * subdivisions that is one sample every 220 m, and a feature much smaller
     * than that will alias rather than appear. Raise `subdivisions` for finer
     * weather, or carry the fine detail in the density field where it is free.
     *
     * ⚠️ It must be ORIGIN-STABLE — the same coordinates must give the same
     * answer after a floating-origin rebase, or the sky will slide off the
     * ground it belongs to. `B3dTerrain.heightSampler()` already promises this,
     * which is why `orographic` uses it rather than the render-space one.
     */
    weather: ((x: number, z: number) => number) | null;
    /**
     * Resolve the field actually in force: an explicit `weather`, or one built
     * from the terrain for `orographic`, or nothing.
     */
    private _weatherField;
    /**
     * Write the local weather field into the vertex channel.
     *
     * ONLY WHEN THE GRID HAS MOVED, which is what the snapped follow buys: the
     * vertices sit on a fixed world lattice, so between snaps every vertex is
     * over the same ground and the samples stay valid. At 14 km over 64
     * subdivisions the snap is 220 m, so at 50 m/s this runs about once every
     * four seconds rather than 4,600 samples a frame.
     */
    private _bakeWeather;
    /**
     * Hand the local weather to a shader — the deck's material or the shadow's.
     *
     * ONE CALL FOR BOTH, because they must agree about where the cloud is. The
     * window is the deck's own grid: centred where the (snapped) mesh sits and
     * exactly `size` across, which is the extent the samples were taken over.
     */
    private _bindWeather;
    /** The bake inputs, as one comparable value. */
    private _currentBakeKey;
    /**
     * `transmission`, DERIVED from `coverage` unless explicitly set.
     *
     * Tonio: *"I'd suggest we derive transmission from cover... rather than make
     * it independent."* Right, because they are not two facts. How much light
     * gets through a cloud is a consequence of how much cloud there is, and
     * letting an author set "total overcast that is also luminous" mostly
     * produces skies that look wrong in a way they then have to go hunting for.
     * One dial that cannot contradict itself beats two that can.
     *
     * | `coverage` | `transmission` | |
     * |---|---|---|
     * | `0` | `0.70` | a clear sky: the little cloud there is, glows |
     * | `1` | `0.25` | solid overcast, dim underneath |
     * | `1.5` | `0` | thick enough that nothing comes through |
     * | `2` | `0` | and it stays there while the base descends |
     *
     * Two straight segments rather than a curve, because those numbers ARE the
     * specification and a curve through them would only add places to argue.
     * `transmission` stays settable for the deliberate case — a bright thin
     * overcast, an alien sky — and `-1`, the default, means "follow the coverage".
     */
    get resolvedTransmission(): number;
    /**
     * How far past solid the deck is, `0…1` — `coverage` 1 → 2.
     *
     * ## Coverage past 1 is thickness
     *
     * At `coverage` 1 there is no sky left to cover, so more weather has to mean
     * something other than more area, and what it means is DEPTH.
     *
     * **It grows UPWARD.** The base stays at `altitude` and the top towers, which
     * is both what Tonio asked for and what the atmosphere does: a cloud base sits
     * at the condensation level, a property of how humid and how warm the air is,
     * and it does not move much. What builds is the top. A deck that thickened
     * downward would be a deck descending to meet you, which happens — but it is
     * a different event, and it is spelled by moving `altitude`.
     *
     * It also composes with everything already here rather than needing new
     * machinery, which is the sign it was the right axis: the whiteout band
     * becomes a slab instead of a plane, `transmission` is already 0 by 1.5 so
     * the underside is already black, and the gloom ramps already have the sun
     * on the way out.
     *
     * ## There is only ever ONE layer to see
     *
     * Thickening exists ONLY at full coverage, and that is a rule rather than a
     * convenience. Tonio: *"the top layer should only be positioned differently
     * from the bottom layer if cover is 100% ... showing two layers above each
     * other looks weird."*
     *
     * Below full cover the sky has gaps, so a second surface would be visible
     * through them — you would be looking through a hole in one deck at another
     * deck, which is two decks and not one cloud. So below 1 there is a single
     * infinitely thin sheet, and the whiteout band is what gives it depth: you
     * never catch it edge-on, so you never learn that it is thin.
     *
     * At and above 1 the field is opaque everywhere, so two skins can exist
     * without both ever being seen — the top from above, the base from below, and
     * whiteout in between if you are inside it.
     */
    get thickening(): number;
    /** How far the cloud TOP currently stands above `altitude`, in metres. */
    get topRise(): number;
    /**
     * How far a unit of local weather lifts each skin, in metres.
     *
     * ONE ANSWER, read by the shader and by the whiteout, because they describe
     * the same surfaces and a disagreement would put the fog somewhere the cloud
     * is not. Below full coverage the base carries the whole bulge — it IS the
     * cloud — and above it the top takes over, blended across the first fifth of
     * the thickening dial so the shape hands off with nothing jumping.
     */
    localScales(): {
        base: number;
        top: number;
    };
    /**
     * The whiteout half-depth, in metres — `thickness` scaled by `coverage`.
     *
     * PASSING THROUGH ALWAYS WHITES OUT. Coverage decides for how LONG, not
     * whether. Tonio: *"I think we always whiteout passing through the layer,
     * just shrink the whiteout depth based on coverage."*
     *
     * The earlier model multiplied immersion by the cloud density right above
     * you, which is defensible — broken cloud IS mostly gaps — and it made the
     * single most important moment in the element unreliable. Whether you got a
     * whiteout depended on where you happened to be when you crossed, so the
     * feature worked in testing and not in use, and no amount of widening the
     * sampling fixed that: it only made every crossing equally grey.
     *
     * A depth is the better dial because it degrades the right way. Thin cloud
     * gives a brief flash as you punch through; overcast gives a long blind
     * climb. Neither is ever nothing, and the difference between them is legible
     * without being a coin toss.
     */
    private _halfDepth;
    /**
     * How far inside the cloud a point is, `0…1`.
     *
     * ## You must never see it edge-on
     *
     * The deck is one flat surface, and a flat surface viewed along its own plane
     * is a LINE — the one angle at which the whole illusion is visibly a sheet.
     * Tonio: "we should give the cloud layer enough depth you never get close to
     * seeing it edge-on."
     *
     * The fix is not geometry, it is the BAND. The whiteout saturates well before
     * the plane (inside `CORE` of the half-depth) and stays saturated well past
     * it, so by the time your eye is level with the sheet there has been nothing
     * but white for a long while. You enter cloud, you are in cloud, you leave
     * cloud — and the moment that would have given the trick away happens where
     * you cannot see anything at all.
     *
     * ⚠️ **But the band is not a licence to be enormous.** It first shipped at
     * 320, which sounds harmless — no geometry has depth here, only the ramp —
     * and it is not: at half-thickness 160 you are "inside" the cloud while
     * standing plainly underneath it, so the screen whites out with the deck
     * visibly overhead and the ground visibly below. Being inside has to mean
     * being inside.
     */
    private _immersionAt;
    /**
     * The deck's whole contribution to the air, at a point.
     *
     * ONE LAYER DOES BOTH JOBS, because they are the same weather seen from two
     * distances. Tonio: *"it should probably set the fog to at minimum hide the
     * end of the cloud layer and at maximum white out the screen."*
     *
     * - **Minimum** — you are under an overcast. The air is the cloud's colour
     *   and `end` comes in to about half the deck, which is what hides the fact
     *   that a 4 km plane has a rim. Real skies do this; it is why you cannot see
     *   the edge of an overcast.
     * - **Maximum** — you are inside it. `end` is arm's length and the screen is
     *   white.
     *
     * `weight` and `veil` diverge here and that is the point: haze owns the air
     * completely while hiding none of the sky (you can still see straight up),
     * and only real immersion stands in front of the sky. One number could not
     * say both.
     */
    private _fogAt;
    /**
     * Cloud shadows on the ground, from the SAME field the deck is drawn from.
     *
     * This is the third reader, and the one that makes the shade underfoot
     * actually belong to the cloud overhead rather than merely resemble it. The
     * receiving half already existed for [b3d-clouds](?b3d-clouds.ts) — a
     * material plugin sampling by world XZ, conforming to terrain, projecting
     * each fragment down the sun — and it was fed by painting blob positions into
     * a window. A deck has no blobs and no window: its field tiles, so the map
     * runs in tiled mode and samples this texture forever in every direction.
     *
     * The texture carries OPACITY, thresholded on the CPU through the shared
     * `cloudOpacity`. That is the whole reason it is baked here rather than
     * thresholded in the receiver's shader: the `coverage` curve already lives in
     * two places (this element's shader and cloud-field.ts) and a third would be
     * one too many — "why is the shadow off the cloud" is exactly the bug that
     * lives in those gaps.
     */
    private _setupShadows;
    /** Push the live dials at the shadow map and its shader. */
    private _syncShadows;
    /**
     * Take the light down for anything under a thick deck — AMBIENT FIRST, then
     * the sun.
     *
     * Tonio: *"transmission first cuts ambient and then cuts the sun."* The order
     * is the whole design, and it is what makes one dial read as weather rather
     * than as a brightness slider. Thickening cloud does two different things to
     * a scene, and they are not simultaneous:
     *
     * 1. **The fill goes.** Early, from `ambientGloomBelow`. The sky stops
     *    bouncing light into every shadow, so the world gets darker and a little
     *    contrastier while the sun is still plainly there. This is an overcast
     *    building.
     * 2. **The key goes.** Late, from `sunGloomBelow`. Now there is no direct sun
     *    down here at all and the scene goes flat. This is the overcast having
     *    arrived.
     *
     * Running them together would just be a dimmer. Staggered, the light changes
     * CHARACTER on the way down, which is the thing you actually notice about
     * weather — and it is why no per-fragment shadow can stand in for it: a
     * shadow says "this patch is darker than that one", never "there is no sun".
     *
     * Both are gated on being BELOW the layer. Above it nothing is obstructed,
     * and climbing out into the light should be dramatic.
     */
    private _applyGloom;
    /**
     * Scale a light's intensity, BORROWING rather than taking it.
     *
     * `b3d-skybox` drives the sun from the time of day, so capturing an intensity
     * once would freeze the day cycle at whatever o'clock we happened to start.
     * Remember what we last WROTE instead: if the light no longer reads that,
     * somebody else moved it and their value becomes the new base. One comparison
     * a frame, and the two systems compose instead of fighting.
     */
    private _dim;
    /** Give every borrowed light back exactly as it was found. */
    private _releaseLights;
    sceneDispose(): void;
}
export declare const b3dCloudDeck: import("tosijs").ElementCreator<B3dCloudDeck>;
//# sourceMappingURL=b3d-cloud-deck.d.ts.map