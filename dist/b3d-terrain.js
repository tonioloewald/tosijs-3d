/*#
# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross contour
+ fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

The terrain streams from one shared **priority pool** of tiles over a **quadtree
LOD**: fine near the camera, coarse far, with exactly one LOD per patch of ground
(a coarse cell is exactly four finer cells — no overlap, no gaps). Each frame the
pool is diffed against the cells that *should* exist; blanks are filled by
priority (near, and biased toward where you're facing/travelling) — reusing free
tiles or stealing the weakest placed one — capped at `fillBudget` per frame so
movement never hitches. Per-tile skirts (with lied normals) hide any crack at a
LOD boundary. Includes floating-origin rebasing and a recenter mechanism — when
travel exceeds `maxTravelDistance`, a `recenter-needed` event fires so the game
layer can orchestrate a visual transition before calling `recenter()`.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dLight, b3dFog, b3dAircraft, b3dLibrary, gameController, inputFocus } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, span, p } = elements

const { demo } = tosi({
  demo: {
    seed: 42,
    grossScale: 0.03,
    detailScale: 0.15,
    horizScale: 4,
    grossAmplitude: 100,
    detailAmplitude: 6,
    wireframe: false,
    debugColor: false,
  },
})

// Priority-pool quadtree LOD: one shared pool of tiles, fine near / coarse far,
// filled by priority (biased toward where you're looking + going). horizScale 4
// makes level-0 tiles 320 across, so the fine region is broad; reach 5000 puts
// the coarse edge just past the fog. Larger radius so the cylinder doesn't repeat.
const terrain = b3dTerrain({
  seed: demo.seed,
  surfaceType: 'cylinder',
  radius: 1000,
  cylinderHeight: 1000,
  tileSize: 80,
  hiResSubdivisions: 32,
  lodLevels: 4,
  splitFactor: 2,
  reach: 5000,
  poolSize: 200,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  horizScale: demo.horizScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  wireframe: demo.wireframe,
  debugColor: demo.debugColor,
})

const posDisplay = span({ class: 'pos-display' })

// Fly the terrain in the VTOL aircraft, starting parked in a hover at a safe
// height above the ground. Triggers climb/descend (or throttle once you're
// moving); pull back to pitch up, turn stick banks.
const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  // Start well above the peaks — with v size 100 the terrain reaches ~106 tall.
  player: true, y: 200, vtolSpeed: 12, maxSpeed: 50,
})

const scene = b3d(
  {
    frameRate: 60,
    gamepad: true,
    update(el) {
      const cam = el.scene.activeCamera
      if (cam) {
        const p = cam.globalPosition // world pos (the chase cam is parented)
        posDisplay.textContent =
          `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      }
    },
  },
  b3dSun({ activeDistance: 80 }),
  b3dSkybox({ timeOfDay: 10, realtimeScale: 0 }),
  b3dLight({ intensity: 0.5 }),
  b3dFog({ syncSkybox: true, start: 1000, end: 4000 }),
  b3dLibrary({ url: '/test-2.glb', type: 'vehicles' }),
  terrain,
  inputFocus(
    gameController(),
    aircraft,
  ),
)

preview.append(
  scene,
  div(
    { class: 'debug-panel' },
    p('Pull back to climb, triggers up/down (throttle when fast), turn to bank'),
    posDisplay,
    label(
      'gross scale ',
      input({ type: 'range', min: 0.005, max: 0.3, step: 0.005, bindValue: demo.grossScale }),
      demo.grossScale,
    ),
    label(
      'detail scale ',
      input({ type: 'range', min: 0.02, max: 1, step: 0.01, bindValue: demo.detailScale }),
      demo.detailScale,
    ),
    label(
      'h size ',
      input({ type: 'range', min: 0.25, max: 10, step: 0.05, bindValue: demo.horizScale }),
      demo.horizScale,
    ),
    label(
      'v size ',
      input({ type: 'range', min: 0, max: 250, step: 1, bindValue: demo.grossAmplitude }),
      demo.grossAmplitude,
    ),
    label(
      'v detail size ',
      input({ type: 'range', min: 0, max: 20, step: 0.5, bindValue: demo.detailAmplitude }),
      demo.detailAmplitude,
    ),
    label(
      'seed ',
      input({ type: 'number', step: 1, style: 'width:5em', bindValue: demo.seed }),
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
    label(
      'debug color ',
      input({ type: 'checkbox', bindValue: demo.debugColor }),
    ),
  )
)

// Regenerate terrain when parameters change
for (const key of ['seed', 'grossScale', 'detailScale', 'horizScale', 'grossAmplitude', 'detailAmplitude', 'wireframe', 'debugColor']) {
  demo[key].observe(() => {
    terrain.regenerate()
  })
}
```
```css
tosi-b3d {
  width: 100%;
  height: 100%;
}
.debug-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  z-index: 10;
}
.debug-panel label {
  display: flex;
  align-items: center;
  gap: 4px;
}
.debug-panel p {
  margin: 0;
  opacity: 0.7;
}
.pos-display {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  opacity: 0.7;
}
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `seed` | `12345` | Noise seed |
| `surfaceType` | `'cylinder'` | `'cylinder'`, `'torus'`, or `'sphere'` |
| `majorRadius` | `100` | Torus major radius |
| `minorRadius` | `40` | Torus minor radius |
| `radius` | `200` | Sphere/cylinder radius |
| `cylinderHeight` | `200` | Cylinder height (v range before reflection) |
| `tileSize` | `10` | World-space size of a level-0 (finest) tile |
| `hiResSubdivisions` | `24` | Vertices per tile edge (same at every level) |
| `lodLevels` | `5` | Number of LOD levels; level k tiles are `tileSize × 2^k` |
| `poolSize` | `220` | Shared tile budget; the pool renders the top-priority cells |
| `fillBudget` | `12` | Max tiles (re)built per frame — caps streaming cost |
| `splitFactor` | `2` | LOD falloff: subdivide a cell when nearer than `splitFactor × tileSize` |
| `reach` | `0` | Terrain radius (0 = auto from the coarsest tile) |
| `grossScale` | `0.1` | Gross noise frequency (per render unit) |
| `detailScale` | `0.5` | Detail noise frequency (per render unit) |
| `horizScale` | `1` | Horizontal world scale — scales every tile's size AND the sampling together (>1 = bigger terrain that reaches further; a clean zoom, not just a frequency change) |
| `debugColor` | `false` | Debug: tint each tile a distinct hashed colour to expose the tile/LOD layout |
| `grossAmplitude` | `8` | Gross height multiplier |
| `detailAmplitude` | `2` | Detail height multiplier |
| `originResetThreshold` | `500` | Distance before origin rebase |
| `maxTravelDistance` | `5000` | Distance before firing recenter-needed event |
| `wireframe` | `false` | Debug: render terrain as wireframe |

## Usage

```javascript
import { b3d, b3dTerrain, plateauFilter } from 'tosijs-3d'

const terrain = b3dTerrain({
  seed: 42,
  surfaceType: 'cylinder',
  grossScale: 0.02,
  grossAmplitude: 10,
})

// Apply a plateau gradient filter for stepped terrain
terrain.grossFilter = plateauFilter(5)
terrain.regenerate()

document.body.append(b3d({}, terrain))
```
*/
/*{ "parent": "Environment" }*/
import { Component } from 'tosijs';
import * as BABYLON from '@babylonjs/core';
import { PerlinNoise } from './perlin-noise';
import { PiecewiseLinearFilter } from './gradient-filter';
import { TorusSampler, SphereSampler, CylinderSampler } from './surface-sampler';
import { vertexLocal, desiredCells, } from './terrain-grid';
const cellKey = (c) => `${c.level},${c.gx},${c.gz}`;
export class B3dTerrain extends Component {
    static styleSpec = {
        ':host': {
            display: 'none',
        },
    };
    static initAttributes = {
        seed: 12345,
        surfaceType: 'cylinder',
        majorRadius: 100,
        minorRadius: 40,
        radius: 200,
        cylinderHeight: 200,
        tileSize: 10,
        hiResSubdivisions: 24,
        lodLevels: 5,
        // Priority-pool streaming (quadtree LOD). `poolSize` tiles are shared across
        // the whole view and filled/stolen by priority; `fillBudget` caps how many are
        // (re)built per frame so movement never hitches. `splitFactor` sets the LOD
        // falloff (subdivide when nearer than splitFactor·tileSize); `reach` is the
        // terrain radius (0 = auto from the coarsest tile).
        poolSize: 220,
        fillBudget: 12,
        splitFactor: 2,
        reach: 0,
        grossScale: 0.1,
        detailScale: 0.5,
        horizScale: 1,
        grossAmplitude: 8,
        detailAmplitude: 2,
        // Debug: tint each tile a distinct colour to reveal the tile/LOD layout.
        debugColor: false,
        originResetThreshold: 500,
        maxTravelDistance: 5000,
        wireframe: false,
    };
    owner = null;
    grossFilter = new PiecewiseLinearFilter();
    detailFilter = new PiecewiseLinearFilter();
    noise;
    noiseSeed = NaN; // last seed the noise was built with (for re-seeding)
    sampler;
    pool = [];
    tileTemplate = null;
    material;
    registered = false;
    // Previous camera XZ (render space) — for the travel-direction interest term.
    lastCamX = NaN;
    lastCamZ = NaN;
    // Conceptual position on the surface (u,v in [0,1))
    worldU = 0;
    worldV = 0;
    // Accumulated render-space offset from origin resets
    originOffsetX = 0;
    originOffsetZ = 0;
    _beforeRender = null;
    connectedCallback() {
        super.connectedCallback();
    }
    sceneReady(owner, scene) {
        this.owner = owner;
        const attrs = this;
        this.noise = new PerlinNoise(attrs.seed);
        this.noiseSeed = attrs.seed;
        this.sampler = this.createSampler();
        this.material = this.createMaterial();
        this.createPool();
        this._beforeRender = () => this.update();
        scene.registerBeforeRender(this._beforeRender);
    }
    sceneDispose() {
        if (this.owner && this._beforeRender) {
            this.owner.scene.unregisterBeforeRender(this._beforeRender);
        }
        for (const tile of this.pool)
            tile.mesh.dispose();
        this.pool = [];
        if (this.material)
            this.material.dispose();
        this.owner = null;
    }
    disconnectedCallback() {
        this.sceneDispose();
        super.disconnectedCallback();
    }
    createSampler() {
        const attrs = this;
        if (attrs.surfaceType === 'sphere') {
            return new SphereSampler(attrs.radius);
        }
        if (attrs.surfaceType === 'torus') {
            return new TorusSampler(attrs.majorRadius, attrs.minorRadius);
        }
        return new CylinderSampler(attrs.radius, attrs.cylinderHeight);
    }
    createMaterial() {
        const mat = new BABYLON.StandardMaterial('terrain-mat', this.owner.scene);
        mat.diffuseColor = new BABYLON.Color3(0.6, 0.75, 0.45);
        mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        mat.backFaceCulling = false;
        mat.wireframe = this.wireframe;
        return mat;
    }
    createPool() {
        const attrs = this;
        const subs = attrs.hiResSubdivisions;
        this.tileTemplate = B3dTerrain.buildTileTemplate(subs);
        const scene = this.owner.scene;
        const tpl = this.tileTemplate;
        const vertCount = tpl.gridCount + tpl.perim.length;
        const count = Math.max(1, attrs.poolSize);
        for (let i = 0; i < count; i++) {
            const mesh = new BABYLON.Mesh(`terrain-tile-${i}`, scene);
            const vd = new BABYLON.VertexData();
            vd.positions = new Float32Array(vertCount * 3);
            vd.normals = new Float32Array(vertCount * 3);
            vd.colors = new Float32Array(vertCount * 4).fill(1); // white until debug tints
            vd.indices = tpl.allIndices;
            vd.applyToMesh(mesh, true); // updatable
            mesh.material = this.material;
            mesh.receiveShadows = true;
            mesh.isVisible = false;
            mesh.position.y = -10000;
            this.pool.push({ mesh, cell: null });
        }
        // Register every tile once (invisible until assigned) so they receive
        // shadows / join reflection lists; the sun's activeDistance gates which
        // actually cast, so far tiles don't blow up the shadow frustum.
        if (this.owner && !this.registered) {
            this.owner.register({ meshes: this.pool.map((t) => t.mesh) });
            this.registered = true;
        }
    }
    // Build the shared tile topology for a given subdivision count: heightfield
    // grid triangles + a perimeter skirt ring (extra verts at the edge XZ that get
    // dropped straight down at fill time). Corners of the loop are shared.
    static buildTileTemplate(n) {
        const vps = n + 1;
        const gridCount = vps * vps;
        const gi = (ix, iz) => iz * vps + ix;
        // Perimeter grid vertices in a closed clockwise loop.
        const perim = [];
        for (let ix = 0; ix < n; ix++)
            perim.push(gi(ix, 0));
        for (let iz = 0; iz < n; iz++)
            perim.push(gi(n, iz));
        for (let ix = n; ix > 0; ix--)
            perim.push(gi(ix, n));
        for (let iz = n; iz > 0; iz--)
            perim.push(gi(0, iz));
        const gridIndices = [];
        for (let iz = 0; iz < n; iz++) {
            for (let ix = 0; ix < n; ix++) {
                const a = gi(ix, iz);
                const b = gi(ix + 1, iz);
                const c = gi(ix, iz + 1);
                const d = gi(ix + 1, iz + 1);
                gridIndices.push(a, c, b, b, c, d);
            }
        }
        // Skirt: a vertical quad from each perimeter grid edge down to its dropped
        // twin (skirt verts are appended after the grid, one per perimeter vertex).
        const skirtIndices = [];
        const pc = perim.length;
        for (let p = 0; p < pc; p++) {
            const pn = (p + 1) % pc;
            const ga = perim[p];
            const gb = perim[pn];
            const sa = gridCount + p;
            const sb = gridCount + pn;
            skirtIndices.push(ga, sa, gb, gb, sa, sb);
        }
        return {
            gridCount,
            perim,
            gridIndices,
            allIndices: [...gridIndices, ...skirtIndices],
        };
    }
    // --- Update loop: priority-pool streaming (quadtree LOD) ---
    update(budgetOverride) {
        if (this.owner == null)
            return;
        const camera = this.owner.scene.activeCamera;
        if (camera == null)
            return;
        const attrs = this;
        // WORLD position — the active camera is often parented (aircraft chase cam),
        // so `.position` is a constant local offset. globalPosition is the real point.
        const camX = camera.globalPosition.x;
        const camZ = camera.globalPosition.z;
        // Floating origin reset. The shift is a whole coarsest-tile, so the trigger
        // distance must exceed it or the shift rounds to 0 (no-op + starvation).
        const resetDist = Math.max(attrs.originResetThreshold, this.coarsestTileSize());
        if (camX * camX + camZ * camZ > resetDist * resetDist) {
            this.resetOrigin(camX, camZ, camera);
            return;
        }
        // Recenter threshold (sample-space drift, for the game layer to handle).
        const travel = Math.hypot(this.originOffsetX + camX, this.originOffsetZ + camZ);
        if (travel > attrs.maxTravelDistance) {
            this.dispatchEvent(new CustomEvent('recenter-needed', {
                bubbles: true,
                detail: { distance: travel },
            }));
        }
        const cfg = this.buildConfig(camX, camZ, camera);
        this.lastCamX = camX;
        this.lastCamZ = camZ;
        this.streamTiles(desiredCells(camX, camZ, cfg), budgetOverride ?? attrs.fillBudget);
    }
    coarsestTileSize() {
        const attrs = this;
        const hs = attrs.horizScale || 1;
        return attrs.tileSize * hs * Math.pow(2, Math.max(0, attrs.lodLevels - 1));
    }
    /** Build the quadtree config from attributes + a facing/travel interest. */
    buildConfig(camX, camZ, camera) {
        const attrs = this;
        const hs = attrs.horizScale || 1;
        const baseTileSize = attrs.tileSize * hs;
        const reach = attrs.reach > 0
            ? attrs.reach
            : this.coarsestTileSize() * (attrs.splitFactor + 1.5);
        // Interest = where you're looking blended with where you're going. Beyond the
        // omni ring, cells that way outrank cells behind, so the pool reaches further
        // ahead. Facing from the camera forward; travel from this frame's motion.
        const fwd = camera.getDirection(BABYLON.Axis.Z);
        let ix = fwd.x;
        let iz = fwd.z;
        if (!Number.isNaN(this.lastCamX)) {
            const tx = camX - this.lastCamX;
            const tz = camZ - this.lastCamZ;
            const tl = Math.hypot(tx, tz);
            if (tl > 1e-3) {
                ix += (tx / tl) * 2; // travel weighted for prefetch
                iz += (tz / tl) * 2;
            }
        }
        const il = Math.hypot(ix, iz);
        return {
            baseTileSize,
            levels: Math.max(1, attrs.lodLevels),
            splitFactor: attrs.splitFactor,
            maxReach: reach,
            omniRadius: baseTileSize * 1.5,
            interest: il > 1e-3 ? { x: ix / il, z: iz / il } : undefined,
        };
    }
    /**
     * Reconcile the pool with the desired cells: keep tiles whose cell is still
     * wanted, free the rest, then fill the highest-priority blanks — reusing free
     * tiles, or STEALING the weakest placed tile a blank outranks — up to `budget`.
     */
    streamTiles(desired, budget) {
        const subs = this.hiResSubdivisions;
        const desiredByKey = new Map();
        for (const c of desired)
            desiredByKey.set(cellKey(c), c);
        const free = [];
        const placed = []; // still-desired, kept
        const covered = new Set();
        for (const t of this.pool) {
            if (t.cell) {
                const k = cellKey(t.cell);
                const want = desiredByKey.get(k);
                if (want) {
                    t.cell.priority = want.priority; // refresh (direction/motion changed)
                    covered.add(k);
                    placed.push(t);
                    continue;
                }
                t.cell = null; // no longer desired → free it (hidden until reused)
                t.mesh.isVisible = false;
            }
            free.push(t);
        }
        const blanks = desired
            .filter((c) => !covered.has(cellKey(c)))
            .sort((a, b) => b.priority - a.priority);
        // Weakest placed tiles first, for stealing when the pool is full.
        placed.sort((a, b) => a.cell.priority - b.cell.priority);
        let steal = 0;
        for (const blank of blanks) {
            if (budget <= 0)
                break;
            let tile = free.pop();
            if (!tile) {
                const weak = placed[steal];
                if (weak && weak.cell.priority < blank.priority) {
                    tile = weak;
                    steal++;
                }
            }
            if (!tile)
                break; // nothing reusable and can't steal → the rest rank lower
            tile.cell = { ...blank };
            this.generateTileMesh(tile, subs, tile.cell);
            budget--;
        }
    }
    // --- Height sampling ---
    heightAt(wx, wz) {
        const attrs = this;
        const u = this.renderToU(wx);
        const v = this.renderToV(wz);
        const surfPt = this.sampler.sample(u, v);
        // horizScale is a horizontal WORLD scale (>1 bigger, <1 smaller): createLods
        // multiplies every tileSize by it (so the terrain physically extends further),
        // and here we divide the sampling frequency by the same factor. The two cancel
        // in the noise argument, so features keep their proportion to the tiles — a
        // clean zoom of the whole terrain rather than just retuning the frequency.
        const hs = attrs.horizScale || 1;
        const gScale = attrs.grossScale / hs;
        const dScale = attrs.detailScale / hs;
        const grossRaw = this.noise.fractal(surfPt.x * gScale, surfPt.y * gScale, surfPt.z * gScale, 4);
        const detailRaw = this.noise.fractal(surfPt.x * dScale, surfPt.y * dScale, surfPt.z * dScale, 3);
        const grossNorm = grossRaw * 0.5 + 0.5;
        const detailNorm = detailRaw * 0.5 + 0.5;
        return (this.grossFilter.evaluate(grossNorm) * attrs.grossAmplitude +
            this.detailFilter.evaluate(detailNorm) * attrs.detailAmplitude);
    }
    generateTileMesh(tile, subdivisions, cell) {
        const mesh = tile.mesh;
        const tpl = this.tileTemplate;
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (positions == null || normals == null)
            return;
        const tileSize = cell.tileSize;
        const vertsPerSide = subdivisions + 1;
        const attrs = this;
        const e = tileSize / subdivisions; // finite-difference step for the normal
        // 1. Heightfield vertices, each given an ANALYTIC normal from the height-field
        //    gradient (heightAt at ±e). Analytic normals are a pure function of world
        //    position, so neighbouring tiles agree exactly on a shared edge vertex →
        //    no lighting seam. (Mesh-averaged normals were computed one-sided at tile
        //    edges — that WAS the seam.) Vertices are placed relative to the cell
        //    centre; the mesh sits at that centre in the world.
        for (let iz = 0; iz < vertsPerSide; iz++) {
            const localZ = vertexLocal(iz, subdivisions, tileSize, true);
            const wz = cell.cz + localZ;
            for (let ix = 0; ix < vertsPerSide; ix++) {
                const localX = vertexLocal(ix, subdivisions, tileSize);
                const wx = cell.cx + localX;
                const height = this.heightAt(wx, wz);
                const nx = this.heightAt(wx - e, wz) - this.heightAt(wx + e, wz);
                const nz = this.heightAt(wx, wz - e) - this.heightAt(wx, wz + e);
                const ny = 2 * e;
                const inv = 1 / Math.hypot(nx, ny, nz);
                const v = iz * vertsPerSide + ix;
                positions[v * 3] = localX;
                positions[v * 3 + 1] = height;
                positions[v * 3 + 2] = localZ;
                normals[v * 3] = nx * inv;
                normals[v * 3 + 1] = ny * inv;
                normals[v * 3 + 2] = nz * inv;
            }
        }
        // 2. Skirt vertices: same XZ as their parent perimeter vertex, dropped
        //    straight down; normal copied from the parent (analytic → matches the
        //    neighbour), so the vertical band reads as ground, not a wall.
        const skirtDepth = Math.max(attrs.grossAmplitude + attrs.detailAmplitude + 2, tileSize * 0.15);
        for (let p = 0; p < tpl.perim.length; p++) {
            const parent = tpl.perim[p];
            const s = tpl.gridCount + p;
            positions[s * 3] = positions[parent * 3];
            positions[s * 3 + 1] = positions[parent * 3 + 1] - skirtDepth;
            positions[s * 3 + 2] = positions[parent * 3 + 2];
            normals[s * 3] = normals[parent * 3];
            normals[s * 3 + 1] = normals[parent * 3 + 1];
            normals[s * 3 + 2] = normals[parent * 3 + 2];
        }
        // 3. Debug: tint the whole tile one hashed colour so the tile layout (and any
        //    seam that survives) is obvious. White = off, so it's a no-op tint.
        const colors = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind);
        if (colors) {
            let cr = 1;
            let cg = 1;
            let cb = 1;
            if (attrs.debugColor) {
                const hh = (Math.imul(cell.gx, 374761393) ^
                    Math.imul(cell.gz, 668265263) ^
                    Math.imul(cell.level + 1, 2246822519)) >>>
                    0;
                cr = 0.3 + 0.65 * ((hh & 255) / 255);
                cg = 0.3 + 0.65 * (((hh >>> 8) & 255) / 255);
                cb = 0.3 + 0.65 * (((hh >>> 16) & 255) / 255);
            }
            for (let v = 0; v < colors.length / 4; v++) {
                colors[v * 4] = cr;
                colors[v * 4 + 1] = cg;
                colors[v * 4 + 2] = cb;
                colors[v * 4 + 3] = 1;
            }
            mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
        }
        mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        mesh.refreshBoundingInfo();
        // Cells never overlap (quadtree), so no per-level y-offset is needed.
        mesh.position.set(cell.cx, 0, cell.cz);
        mesh.rotationQuaternion = null;
        mesh.isVisible = true;
    }
    // --- Coordinate mapping ---
    renderToU(renderX) {
        const circumU = this.getCircumferenceU();
        const globalX = renderX + this.originOffsetX;
        return this.worldU + globalX / circumU;
    }
    renderToV(renderZ) {
        const circumV = this.getCircumferenceV();
        const globalZ = renderZ + this.originOffsetZ;
        return this.worldV + globalZ / circumV;
    }
    getCircumferenceU() {
        const attrs = this;
        if (attrs.surfaceType === 'sphere') {
            return 2 * Math.PI * attrs.radius;
        }
        if (attrs.surfaceType === 'torus') {
            return 2 * Math.PI * attrs.majorRadius;
        }
        return 2 * Math.PI * attrs.radius; // cylinder
    }
    getCircumferenceV() {
        const attrs = this;
        if (attrs.surfaceType === 'sphere') {
            return Math.PI * attrs.radius;
        }
        if (attrs.surfaceType === 'torus') {
            return 2 * Math.PI * attrs.minorRadius;
        }
        return attrs.cylinderHeight; // cylinder
    }
    // --- Floating origin ---
    resetOrigin(camX, camZ, camera) {
        // Rebase on the COARSEST tile so the shift is a whole number of tiles at every
        // level — each placed cell's grid index stays integer through the shift.
        const coarsest = this.coarsestTileSize();
        const shiftX = Math.round(camX / coarsest) * coarsest;
        const shiftZ = Math.round(camZ / coarsest) * coarsest;
        for (const tile of this.pool) {
            tile.mesh.position.x -= shiftX;
            tile.mesh.position.z -= shiftZ;
            if (tile.cell) {
                tile.cell.cx -= shiftX;
                tile.cell.cz -= shiftZ;
                tile.cell.gx -= shiftX / tile.cell.tileSize;
                tile.cell.gz -= shiftZ / tile.cell.tileSize;
            }
        }
        // Shift whatever actually carries the camera through the world: its parent
        // (e.g. the aircraft) if parented, else the camera itself. The controller
        // keeps integrating from the shifted position, so it's seamless.
        const carrier = camera.parent ?? camera;
        carrier.position.x -= shiftX;
        carrier.position.z -= shiftZ;
        this.originOffsetX += shiftX;
        this.originOffsetZ += shiftZ;
        this.lastCamX = NaN; // travel term is meaningless across the discontinuity
    }
    // Reset sample origin — call after a visual discontinuity
    recenter() {
        this.worldU = 0;
        this.worldV = 0;
        this.originOffsetX = 0;
        this.originOffsetZ = 0;
        this.clearPool();
    }
    clearPool() {
        for (const tile of this.pool) {
            tile.cell = null;
            tile.mesh.isVisible = false;
        }
    }
    // Rebuild after a parameter change. A height-only change keeps the same cells
    // (so placed tiles would be kept, unbuilt) — clear the pool so everything is a
    // blank and refill in full this frame (budget = pool size, no per-frame cap).
    regenerate() {
        const attrs = this;
        if (this.material)
            this.material.wireframe = attrs.wireframe;
        // Re-seed if the seed changed — terrain is fully determined by (seed, params),
        // so the same seed always reproduces the same world.
        if (attrs.seed !== this.noiseSeed) {
            this.noiseSeed = attrs.seed;
            this.noise = new PerlinNoise(attrs.seed);
        }
        this.clearPool();
        this.update(this.pool.length);
    }
}
export const b3dTerrain = B3dTerrain.elementCreator({
    tag: 'tosi-b3d-terrain',
});
//# sourceMappingURL=b3d-terrain.js.map