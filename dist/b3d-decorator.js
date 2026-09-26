/*#
# b3d-decorator

**Rocks and trees on the terrain, by budget and by climate.** Drop it into a
scene with a `<tosi-b3d-terrain>`. It scatters a fixed NUMBER of things around
the camera, chosen by [scatter](/scatter/)'s climate rules (the same
temperature, moisture, altitude and slope axes the terrain's biome shader
paints with), so the pines stand where the ground is cold forest, and the
palms at a warm shoreline.

```javascript
b3dDecorator({ budget: 5000, radius: 900 })
```

## How it draws

Every model is drawn with **thin instances**: one draw call per model PART,
however many copies. A few dozen Nature Kit models make a few dozen draw
calls, whether the budget is 1,000 or 20,000. What grows with the budget is
vertices. The Perf Stats panel's `decorator` row shows the counts and the
build time.

The scatter is **world-anchored**, so when the camera moves far enough
(`radius / 4`) it re-scatters around it and only the edge changes. It follows
the terrain's floating origin and rebuilds when the terrain's shape or climate
changes.

## Shadows, where they show

Casting from every copy puts each one into all four shadow cascades:
measured at +3.7 ms (2k) to +6.7 ms (20k) on an M5 Max, most of it for
copies too far away for their shadow to be seen. So each part has a
**shadow-only twin** (on a layer the camera does not draw)
holding just the nearest `shadowBudget` copies within `shadowRange`, re-picked
as the camera moves. The visible copies never cast. Measured after: 5 or 600
casting copies cost the same. What remains (≈2.4 ms there) is the sun's
shadow pass switching on at all, which the sun's own settings govern.

## Collision, where it matters

A small POOL of invisible colliders follows the camera: trunks as thin
cylinders, boulders as boxes (see `ScatterRule.collider`), assigned to the
nearest placements within `colliderRange`. A fixed cost however big the
budget, and it exists exactly where something can bump into it. They collide
the way everything here does (`checkCollisions` + `moveWithCollisions`), so a
biped stops at a trunk and can stand on a boulder.

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `budget` | `2000` | How many things to place. Performance cares about this, not density |
| `radius` | `900` | Metres around the camera to fill |
| `seed` | `1` | Same seed, same forest |
| `url` | `''` | The model library; empty = Kenney's Nature Kit on the CDN |
| `scale` | `1` | Multiplies every rule's scale range |
| `follow` | `'on'` | Re-scatter as the camera moves |
| `shadows` | `'off'` | Cast shadows — from the NEAR copies only (`shadowRange`, `shadowBudget`), through a shadow-only twin of each part. Copies always RECEIVE shadows. Live |
| `colliders` | `'on'` | The nearby collider pool |
| `colliderRange` | `60` | Metres around the camera that get colliders |
| `colliderPool` | `48` | How many colliders at most |
| `shadowRange` | `200` | Metres around the camera whose copies cast shadows (with `shadows: 'on'`) |
| `shadowBudget` | `600` | How many of the nearest copies cast, at most |
*/
/*{ "parent": "Environment" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild, isOff, publicName } from './b3d-utils.js';
import { assetUrl } from './asset-url.js';
import { mantaAxes } from './biome-chart.js';
import { scatterPlacements, NearIndex, pruneScatterCache, NATURE_KIT_RULES, } from './scatter.js';
/*
A layer bit the camera does not see (its default mask is 0x0FFFFFFF). The shadow
pass renders its explicit caster list WITHOUT checking layer masks
(ObjectRenderer.forceLayerMaskCheck is false), so a mesh on this layer casts
but is never drawn to the screen.
*/
const SHADOW_ONLY_LAYER = 0x10000000;
export class B3dDecorator extends B3dChild {
    static preferredTagName = 'tosi-b3d-decorator';
    static shadowStyleSpec = { ':host': { display: 'none' } };
    static initAttributes = {
        budget: 2000,
        radius: 900,
        seed: 1,
        url: '',
        scale: 1,
        follow: 'on',
        shadows: 'off',
        colliders: 'on',
        colliderRange: 60,
        colliderPool: 48,
        shadowRange: 200,
        shadowBudget: 600,
    };
    /** The rules. Replace before the first build (or call `rebuild()`). */
    rules = NATURE_KIT_RULES;
    /** What was placed last, in LOGICAL world coordinates. */
    placements = [];
    /**
     * The NEAR-SET over `placements`: the one query everything near the viewer
     * uses (colliders, shadow casters; LOD, interaction and sound next).
     */
    near = new NearIndex([]);
    /** Milliseconds the last build took (scatter + instance buffers). */
    lastBuildMs = 0;
    _root = null;
    _container = null;
    _models = new Map();
    _drawn = [];
    _center = null;
    /*
    Ground samples (height + normal), kept across re-scatters: a move samples
    only the ring it entered. Cleared when the terrain's shape changes; the
    climate and rules are re-evaluated every build, so dialling them is cheap
    too.
    */
    _cache = new Map();
    _cacheKey = '';
    _key = '';
    _observer = null;
    _loadGen = 0;
    _pool = [];
    _poolKind = [];
    _nextColliderCheck = 0;
    _nextShadowCheck = 0;
    /*
    SHADOWS, managed HERE rather than through owner.register(). The sun gates
    its casters by the distance of each mesh's ORIGIN from the camera
    (\`activeDistance\`, 80 m in Land and Sky), and a thin-instance part's origin
    is the world origin, not any tree — so the whole set would cast or not by
    how far the camera happened to be from (0, 0, 0). So each part goes straight
    into the sun's shadow generator, and stays there while \`shadows\` is on.
    Re-checked each second: the sun can rebuild its generator.
    */
    _syncShadows() {
        const sun = this.owner?.querySelector('tosi-b3d-sun');
        const gen = sun?.shadowGenerator;
        const list = gen?.getShadowMap()?.renderList;
        if (gen == null || list == null)
            return;
        const on = !isOff(this.shadows);
        if (!on)
            this._shadowFrom = null;
        for (const info of this._models.values())
            for (const p of info?.parts ?? []) {
                // The VISIBLE copies never cast — only their near-only twins do.
                if (list.includes(p.mesh))
                    gen.removeShadowCaster(p.mesh);
                const has = list.includes(p.shadow);
                const live = p.shadow.isEnabled() && p.shadow.thinInstanceCount > 0;
                if (on && live && !has)
                    gen.addShadowCaster(p.shadow);
                else if ((!on || !live) && has)
                    gen.removeShadowCaster(p.shadow);
            }
    }
    _debugOff = null;
    _measuring = false;
    /** Builds completed — measureCost waits on it. */
    _builds = 0;
    sceneReady(owner, scene) {
        super.sceneReady(owner, scene);
        this._root = new BABYLON.TransformNode('decorator', scene);
        owner.registerWorldRoot(this._root);
        const gen = ++this._loadGen;
        const url = this.url || assetUrl('kenney/libraries/nature-kit.glb');
        BABYLON.SceneLoader.LoadAssetContainerAsync(url, '', scene)
            .then((c) => {
            if (gen !== this._loadGen) {
                c.dispose();
                return;
            }
            this._container = c;
            c.addAllToScene();
            // The library's own nodes are the SOURCES, never drawn themselves.
            for (const n of c.rootNodes)
                n.setEnabled(false);
            this._key = '';
        })
            .catch((err) => console.warn('b3d-decorator: library failed', err));
        this._observer = scene.onBeforeRenderObservable.add(() => this._tick());
        this._debugOff =
            owner.addDebugSource?.({
                name: 'decorator',
                lines: () => [
                    `placed ${this.placements.length} / ${this.budget}`,
                    `parts ${this._drawn.length} (≈ draw calls)`,
                    `build ${this.lastBuildMs.toFixed(0)} ms`,
                    `colliders ${this._pool.filter((m) => m.isEnabled()).length}`,
                ],
            }) ?? null;
    }
    sceneDispose() {
        this._loadGen++;
        if (this._observer != null)
            this.owner?.scene.onBeforeRenderObservable.remove(this._observer);
        this._observer = null;
        this._debugOff?.();
        this._debugOff = null;
        this._clearParts();
        for (const m of this._pool)
            m.dispose();
        this._pool = [];
        this._poolKind = [];
        if (this._root != null) {
            this.owner?.unregisterWorldRoot?.(this._root);
            this._root.dispose();
        }
        this._root = null;
        this._container?.dispose();
        this._container = null;
        this._models.clear();
        this.placements = [];
        this._cache.clear();
        this._cacheKey = '';
        this._center = null;
        this._key = '';
        super.sceneDispose();
    }
    /** Throw away the current scatter and build again on the next frame. */
    rebuild() {
        this._key = '';
    }
    _terrain() {
        return this.owner?.querySelector('tosi-b3d-terrain') ?? null;
    }
    /** Everything the placements depend on, as one string. */
    _currentKey(terrain) {
        const p = terrain?.biomePlugin?.params;
        return [
            this.budget,
            this.radius,
            this.seed,
            this.scale,
            terrain?.generationKey ?? '',
            terrain?.provinceField != null ? 'province' : '',
            p
                ? [p.seaLevel, p.baseTemperature, p.lapseRate, p.mapMoisture].join(',')
                : '',
        ].join('|');
    }
    _tick() {
        const scene = this.owner?.scene;
        const cam = scene?.activeCamera;
        const terrain = this._terrain();
        if (scene == null ||
            cam == null ||
            this._container == null ||
            terrain == null)
            return;
        if (typeof terrain.heightSampler !== 'function')
            return;
        const off = terrain.originOffset ?? { x: 0, z: 0 };
        const here = {
            x: cam.globalPosition.x + off.x,
            z: cam.globalPosition.z + off.z,
        };
        const key = this._currentKey(terrain);
        const moved = !isOff(this.follow) &&
            this._center != null &&
            Math.hypot(here.x - this._center.x, here.z - this._center.z) >
                this.radius * 0.25;
        if (key !== this._key || moved) {
            this._key = key;
            this._build(terrain, here, off);
        }
        if (performance.now() >= this._nextShadowCheck) {
            this._nextShadowCheck = performance.now() + 300;
            this._pickShadowCasters(here, off);
            this._syncShadows();
        }
        if (!isOff(this.colliders) &&
            performance.now() >= this._nextColliderCheck) {
            this._nextColliderCheck = performance.now() + 250;
            this._placeColliders(here, off);
        }
    }
    _model(name) {
        if (this._models.has(name))
            return this._models.get(name);
        const c = this._container;
        const node = [...c.transformNodes, ...c.meshes].find((n) => publicName(n.name) === name);
        let info = null;
        if (node != null) {
            /*
            THE glTF ROOT'S FRAME, not the world's. The loader mirrors the whole
            file on \`__root__\` (glTF is right-handed, Babylon left-handed), and
            for an ordinary mesh Babylon undoes the mirror's effect on culling by
            flipping side orientation when the WORLD matrix's determinant is
            negative. A thin instance never gets that flip — Babylon decides from
            the MESH's matrix (identity here), not the instance's — so a mirror
            carried inside the instance matrices rendered every tree inside out.
            Dropping the mirror AND the flip is the same two reversals removed, so
            the winding comes out right; the model is mirrored left-to-right, which
            no tree or rock can show. (canonicalize() strips it for the same
            reason.)
            */
            let top = node;
            while (top.parent != null)
                top = top.parent;
            const toRoot = top
                .computeWorldMatrix(true)
                .clone();
            toRoot.invert();
            node.computeWorldMatrix(true);
            const origin = BABYLON.Vector3.TransformCoordinates(node.getAbsolutePosition(), toRoot);
            const unshift = BABYLON.Matrix.Translation(-origin.x, -origin.y, -origin.z);
            const parts = [];
            const min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
            const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
            const meshes = [
                ...(node instanceof BABYLON.Mesh ? [node] : []),
                ...node.getChildMeshes(false),
            ].filter((m) => m instanceof BABYLON.Mesh && m.getTotalVertices() > 0);
            for (const m of meshes) {
                // The part in root space, the model's own library position removed.
                const rel = m
                    .computeWorldMatrix(true)
                    .multiply(toRoot)
                    .multiply(unshift);
                const part = m.clone(`deco-${name}`, this._root, true);
                part.position.setAll(0);
                part.rotationQuaternion = BABYLON.Quaternion.Identity();
                part.scaling.setAll(1);
                part.setEnabled(true);
                part.isPickable = false;
                part.checkCollisions = false;
                // Trees shade each other, and the terrain's shadows fall on them.
                part.receiveShadows = true;
                const shadow = m.clone(`deco-${name}-shadow`, this._root, true);
                shadow.position.setAll(0);
                shadow.rotationQuaternion = BABYLON.Quaternion.Identity();
                shadow.scaling.setAll(1);
                shadow.layerMask = SHADOW_ONLY_LAYER;
                shadow.isPickable = false;
                shadow.checkCollisions = false;
                shadow.receiveShadows = false;
                shadow.setEnabled(false);
                parts.push({ mesh: part, shadow, rel });
                const bb = m.getBoundingInfo().boundingBox;
                for (const v of bb.vectorsWorld) {
                    const p = BABYLON.Vector3.TransformCoordinates(BABYLON.Vector3.TransformCoordinates(v, toRoot), unshift);
                    min.minimizeInPlace(p);
                    max.maximizeInPlace(p);
                }
            }
            if (parts.length > 0)
                info = { parts, min, max };
        }
        this._models.set(name, info);
        return info;
    }
    _clearParts() {
        for (const info of this._models.values())
            for (const p of info?.parts ?? []) {
                p.mesh.thinInstanceCount = 0;
                p.shadow.thinInstanceCount = 0;
                p.shadow.setEnabled(false);
            }
        this._drawn = [];
    }
    _build(terrain, here, off) {
        const t0 = performance.now();
        const height = terrain.heightSampler();
        const cfg = terrain.biomePlugin?.params ?? {
            seaLevel: 0,
            baseTemperature: 0.6,
            lapseRate: 0.004,
            mapMoisture: 0.5,
        };
        // The cache holds GROUND only, so it is stale only when the terrain is.
        const groundKey = String(terrain?.generationKey ?? '');
        if (groundKey !== this._cacheKey) {
            this._cache.clear();
            this._cacheKey = groundKey;
        }
        const rules = this.rules.map((r) => ({
            ...r,
            scale: [r.scale[0] * this.scale, r.scale[1] * this.scale],
        }));
        let lastX = NaN;
        let lastZ = NaN;
        let lastFactor = 1;
        this.placements = scatterPlacements({
            budget: Math.max(0, Math.floor(this.budget)),
            seed: this.seed,
            center: here,
            radius: this.radius,
            height,
            climate: (_x, _z, y) => {
                const { temperature, moisture } = mantaAxes(y, cfg);
                return { temperature, moisture, altitude: y - cfg.seaLevel };
            },
            rules,
            cache: this._cache,
            /*
            THE PROVINCE SAYS WHAT GROWS: volcanism suppresses plants (rocks are
            at home on a lava field), with the same thresholds the biome shader
            uses to paint lava and basalt, so nothing grows where the ground reads
            as rock. Nothing is suppressed without a province.
            */
            suppress: typeof terrain.provinceField === 'function'
                ? (x, z, kind) => {
                    if (kind === 'rock' || kind === 'boulder')
                        return 1;
                    // Asked once per plant RULE at the same point: evaluate the
                    // province once per point.
                    if (x !== lastX || z !== lastZ) {
                        lastX = x;
                        lastZ = z;
                        const v = terrain.provinceField(x, z);
                        const t = Math.max(0, Math.min(1, (v - 0.02) / 0.1));
                        lastFactor = 1 - t * t * (3 - 2 * t);
                    }
                    return lastFactor;
                }
                : undefined,
        });
        this.near = new NearIndex(this.placements, 32);
        pruneScatterCache(this._cache, here, this.radius * 1.5);
        this._center = here;
        // The root is where render space starts: reset it, and place in render
        // coordinates for the CURRENT origin. Later shifts move the root.
        if (this._root != null)
            this._root.position.setAll(0);
        const byModel = new Map();
        for (const p of this.placements) {
            const list = byModel.get(p.model);
            if (list)
                list.push(p);
            else
                byModel.set(p.model, [p]);
        }
        this._clearParts();
        for (const [name, list] of byModel) {
            const info = this._model(name);
            if (info == null)
                continue;
            this._writeInstances(list, info, off, false);
            for (const part of info.parts)
                this._drawn.push(part.mesh);
        }
        this._shadowFrom = null; // re-pick the near casters for this build
        this._syncShadows();
        this.lastBuildMs = performance.now() - t0;
        this._builds++;
    }
    _scratch = {
        up: BABYLON.Vector3.Up(),
        q: new BABYLON.Quaternion(),
        tilt: new BABYLON.Quaternion(),
        yawQ: new BABYLON.Quaternion(),
        n: new BABYLON.Vector3(),
        srt: new BABYLON.Matrix(),
        scl: new BABYLON.Vector3(),
        pos: new BABYLON.Vector3(),
        out: new BABYLON.Matrix(),
    };
    /** One model's copies, into each part's VISIBLE mesh or its SHADOW twin. */
    _writeInstances(list, info, off, shadow) {
        const { up, q, tilt, yawQ, n, srt, scl, pos, out } = this._scratch;
        const rule = this.rules[list[0].rule];
        const align = rule?.alignToSlope ?? 0;
        /*
        ON THE GROUND, not above it. Two corrections, per placement:
        - the model's lowest point goes to the ground, whatever its origin;
        - it SINKS on a slope by footprint radius × tan(the tilt it did not take
          up by leaning), so the downhill side of the base is not in mid-air.
          A trunk's footprint is its trunk, not its canopy; a rock's is itself.
        */
        const width = Math.min(info.max.x - info.min.x, info.max.z - info.min.z);
        const footprint = width * (rule?.collider === 'trunk' ? 0.12 : 0.45);
        const height = info.max.y - info.min.y;
        for (const part of info.parts) {
            const mesh = shadow ? part.shadow : part.mesh;
            const buf = new Float32Array(list.length * 16);
            list.forEach((p, i) => {
                BABYLON.Quaternion.RotationYawPitchRollToRef(p.yaw, 0, 0, yawQ);
                n.set(p.normal.x, p.normal.y, p.normal.z);
                BABYLON.Vector3.LerpToRef(up, n, align, n);
                n.normalize();
                BABYLON.Quaternion.FromUnitVectorsToRef(up, n, tilt);
                yawQ.multiplyToRef(tilt, q); // yaw first, then lean to the ground
                scl.setAll(p.scale);
                const slope = Math.acos(Math.min(1, Math.max(-1, p.normal.y)));
                const residual = Math.tan(slope * (1 - align));
                const sink = p.scale * (footprint * residual + height * 0.02);
                pos.set(p.x - off.x, p.y - info.min.y * p.scale - sink, p.z - off.z);
                BABYLON.Matrix.ComposeToRef(scl, q, pos, srt);
                part.rel.multiplyToRef(srt, out);
                out.copyToArray(buf, i * 16);
            });
            mesh.thinInstanceSetBuffer('matrix', buf, 16, true);
            mesh.thinInstanceRefreshBoundingInfo(false);
        }
    }
    /*
    NEAR-ONLY SHADOWS. Casting from every copy put each one into all four
    cascades — measured at +3.7 ms (2k) to +6.7 ms (20k) on an M5 Max, mostly a
    FIXED cost, and almost all of it for copies too far away for their shadow to
    be seen. So the casters are a separate, shadow-only twin of each part
    holding just the nearest \`shadowBudget\` copies within \`shadowRange\`,
    re-picked when the camera has moved a few metres.
    */
    _shadowFrom = null;
    _pickShadowCasters(here, off) {
        if (isOff(this.shadows))
            return;
        if (this._shadowFrom != null &&
            Math.hypot(here.x - this._shadowFrom.x, here.z - this._shadowFrom.z) < 5)
            return;
        this._shadowFrom = here;
        const chosen = this.near.near(here.x, here.z, this.shadowRange, this.shadowBudget);
        const byModel = new Map();
        for (const { item: p } of chosen) {
            const list = byModel.get(p.model);
            if (list)
                list.push(p);
            else
                byModel.set(p.model, [p]);
        }
        for (const [name, info] of this._models) {
            if (info == null)
                continue;
            const list = byModel.get(name);
            if (list == null) {
                for (const part of info.parts) {
                    part.shadow.thinInstanceCount = 0;
                    part.shadow.setEnabled(false);
                }
                continue;
            }
            this._writeInstances(list, info, off, true);
            for (const part of info.parts)
                part.shadow.setEnabled(true);
        }
        this._syncShadows();
    }
    /*
    THE COLLIDER POOL — invisible primitives on the NEAREST placements that have
    a collider, within colliderRange. Recycled every quarter second.
    */
    _placeColliders(here, off) {
        const scene = this.owner?.scene;
        if (scene == null || this._root == null)
            return;
        const range = this.colliderRange;
        const want = this.near
            .near(here.x, here.z, range, this.colliderPool, (p) => this.rules[p.rule]?.collider != null)
            .map(({ item: p, d }) => ({
            p,
            d,
            kind: this.rules[p.rule].collider,
        }));
        // Grow the pool as needed; primitives are unit-sized and scaled per use.
        while (this._pool.length < want.length) {
            const i = this._pool.length;
            const m = BABYLON.MeshBuilder.CreateBox(`deco-collider-${i}`, { size: 1 }, scene);
            m.parent = this._root;
            m.isVisible = false;
            m.isPickable = true;
            m.checkCollisions = true;
            m.rotationQuaternion = new BABYLON.Quaternion();
            this._pool.push(m);
            this._poolKind.push('box');
        }
        const rootPos = this._root.position;
        this._pool.forEach((m, i) => {
            const w = want[i];
            if (w == null) {
                m.setEnabled(false);
                return;
            }
            const info = this._model(w.p.model);
            if (info == null) {
                m.setEnabled(false);
                return;
            }
            const s = w.p.scale;
            const size = info.max.subtract(info.min).scale(s);
            const base = new BABYLON.Vector3(w.p.x - off.x, w.p.y, w.p.z - off.z).subtract(rootPos);
            if (w.kind === 'trunk') {
                // A thin post up the middle: the trunk, not the canopy.
                const r = Math.max(0.15, Math.min(size.x, size.z) * 0.12);
                m.scaling.set(r * 2, size.y * 0.7, r * 2);
                m.position.set(base.x, base.y + size.y * 0.35, base.z);
            }
            else {
                m.scaling.set(size.x * 0.9, size.y * 0.9, size.z * 0.9);
                m.position.set(base.x, base.y + size.y * 0.45, base.z);
            }
            BABYLON.Quaternion.RotationYawPitchRollToRef(w.p.yaw, 0, 0, m.rotationQuaternion);
            m.setEnabled(true);
        });
    }
    /**
     * WHAT IT COSTS, measured in the browser it runs in. Steps through budgets,
     * lets each build and settle, then samples frames. Restores the budget.
     *
     *   await document.querySelector('tosi-b3d-decorator').measureCost()
     *
     * Frame time is capped by the display's refresh, so when it reads flat the
     * GPU line is the one that shows the cost — where the browser exposes GPU
     * timer queries (often only behind a flag); otherwise watch where the
     * frame time first leaves the refresh interval.
     */
    async measureCost(budgets = [0, 1000, 5000, 10000, 20000], seconds = 3) {
        const scene = this.owner?.scene;
        if (scene == null)
            return [];
        // ONE at a time: two interleaved runs fight over the budget and every
        // number is garbage (it happened — a timed-out caller's run kept going).
        if (this._measuring)
            throw new Error('measureCost is already running');
        this._measuring = true;
        const owner = this.owner;
        const engine = scene.getEngine();
        const engineI = new BABYLON.EngineInstrumentation(engine);
        engineI.captureGPUFrameTime = true;
        const sceneI = new BABYLON.SceneInstrumentation(scene);
        const original = this.budget;
        /*
        UNTHROTTLED while measuring. <tosi-b3d>'s `frameRate` paces renders (30 by
        default), so frame time would read the throttle, not the load. Lifted to
        whatever the display allows, and restored.
        */
        const originalRate = owner.frameRate;
        owner.frameRate = 1000;
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const results = [];
        try {
            for (const budget of budgets) {
                this.budget = budget;
                this.rebuild();
                // Wait for THIS budget's build to land, then let it settle.
                const asked = this._builds;
                for (let i = 0; i < 100 && this._builds === asked; i++)
                    await wait(50);
                await wait(800);
                const frames = [];
                const gpu = [];
                const draws = [];
                let last = performance.now();
                let n = 0;
                const obs = scene.onAfterRenderObservable.add(() => {
                    const now = performance.now();
                    if (n++ > 5) {
                        frames.push(now - last);
                        draws.push(sceneI.drawCallsCounter.current);
                        const g = engineI.gpuFrameTimeCounter.current;
                        if (g > 0)
                            gpu.push(g * 1e-6); // ns → ms
                    }
                    last = now;
                });
                await wait(seconds * 1000);
                scene.onAfterRenderObservable.remove(obs);
                const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
                const sorted = [...frames].sort((a, b) => a - b);
                results.push({
                    budget,
                    placed: this.placements.length,
                    buildMs: Math.round(this.lastBuildMs),
                    frameMs: Number(mean(frames).toFixed(2)),
                    frameP95Ms: Number((sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(2)),
                    gpuMs: gpu.length ? Number(mean(gpu).toFixed(2)) : null,
                    drawCalls: Math.round(mean(draws)),
                    activeIndices: scene.getActiveIndices(),
                });
            }
        }
        finally {
            this.budget = original;
            owner.frameRate = originalRate;
            this.rebuild();
            sceneI.dispose();
            engineI.dispose();
            this._measuring = false;
        }
        return results;
    }
    render() {
        super.render();
        // Budget, radius, seed and scale are in the key; changing one rebuilds.
    }
}
export const b3dDecorator = B3dDecorator.elementCreator();
//# sourceMappingURL=b3d-decorator.js.map