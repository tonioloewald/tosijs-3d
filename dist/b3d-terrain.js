/*#
# b3d-terrain

Procedural terrain generator using 3D Perlin noise sampled on a cylinder surface.
Longitude (u) wraps seamlessly; latitude (v) reflects at the midpoint, creating
symmetric hemispheres with no singularities. Two noise layers (gross contour
+ fine detail) each pass through gradient filters for shaping plateaus, mesas, etc.

The terrain is built from a single kind of tile (a heightfield ground patch) in
concentric LOD levels that stream around the camera. Level 0 is full detail at
`tileSize`; each level out doubles the tile size (`tileSize × 2^level`) so distant
ground is covered cheaply by stretched tiles. Levels overlap rather than abut —
coarser levels sit a hair lower so a finer tile always wins where they overlap,
and coarse tiles fully covered by a finer level are culled — so there are no gaps
to skirt over. Includes floating-origin rebasing and a recenter mechanism — when
travel exceeds `maxTravelDistance`, a `recenter-needed` event fires so the game
layer can orchestrate a visual transition before calling `recenter()`.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dTerrain, b3dLight, b3dFog, b3dAircraft, b3dLibrary, gameController, inputFocus } from 'tosijs-3d'
import { tosi, elements } from 'tosijs'
const { div, label, input, span, p } = elements

const { demo } = tosi({
  demo: {
    grossScale: 0.03,
    detailScale: 0.15,
    horizScale: 1,
    grossAmplitude: 30,
    detailAmplitude: 6,
    wireframe: false,
  },
})

// Big tiles: a 5x5 ring of 80-unit level-0 tiles (~400 units across) keeps you
// surrounded by full detail instead of skating over a tablecloth. Larger radius
// so the cylinder doesn't visibly repeat across the much wider LOD coverage.
const terrain = b3dTerrain({
  seed: 42,
  surfaceType: 'cylinder',
  radius: 1000,
  cylinderHeight: 1000,
  tileSize: 80,
  hiResGrid: 5,
  hiResSubdivisions: 32,
  lodLevels: 6,
  grossScale: demo.grossScale,
  detailScale: demo.detailScale,
  horizScale: demo.horizScale,
  grossAmplitude: demo.grossAmplitude,
  detailAmplitude: demo.detailAmplitude,
  wireframe: demo.wireframe,
})

const posDisplay = span({ class: 'pos-display' })

// Fly the terrain in the VTOL aircraft, starting parked in a hover at a safe
// height above the ground. Triggers climb/descend (or throttle once you're
// moving); pull back to pitch up, turn stick banks.
const aircraft = b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 80, vtolSpeed: 12, maxSpeed: 50,
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
      'horiz scale ',
      input({ type: 'range', min: 0.25, max: 6, step: 0.05, bindValue: demo.horizScale }),
      demo.horizScale,
    ),
    label(
      'gross amp ',
      input({ type: 'range', min: 0, max: 80, step: 1, bindValue: demo.grossAmplitude }),
      demo.grossAmplitude,
    ),
    label(
      'detail amp ',
      input({ type: 'range', min: 0, max: 20, step: 0.5, bindValue: demo.detailAmplitude }),
      demo.detailAmplitude,
    ),
    label(
      'wireframe ',
      input({ type: 'checkbox', bindValue: demo.wireframe }),
    ),
  )
)

// Regenerate terrain when parameters change
for (const key of ['grossScale', 'detailScale', 'horizScale', 'grossAmplitude', 'detailAmplitude', 'wireframe']) {
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
| `tileSize` | `10` | World-space size of a level-0 tile |
| `hiResGrid` | `5` | NxN grid of tiles per LOD level (around the camera) |
| `hiResSubdivisions` | `24` | Vertices per tile edge (same at every level) |
| `lodLevels` | `5` | Number of LOD levels; level k uses `tileSize × 2^k` tiles |
| `grossScale` | `0.1` | Gross noise frequency (per render unit) |
| `detailScale` | `0.5` | Detail noise frequency (per render unit) |
| `horizScale` | `1` | Horizontal world scale — scales every tile's size AND the sampling together (>1 = bigger terrain that reaches further; a clean zoom, not just a frequency change) |
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
import { lodTileSize, tileCenter, vertexWorld, cellIndex, coverageHalf, spanInside, } from './terrain-grid';
// Vertical separation between adjacent LOD levels (metres). Tiny — just enough to
// keep a finer tile in front of the coarse one it overlaps (no z-fighting).
const LOD_Y_STEP = 0.03;
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
        hiResGrid: 5,
        hiResSubdivisions: 24,
        lodLevels: 5,
        grossScale: 0.1,
        detailScale: 0.5,
        horizScale: 1,
        grossAmplitude: 8,
        detailAmplitude: 2,
        originResetThreshold: 500,
        maxTravelDistance: 5000,
        wireframe: false,
    };
    owner = null;
    grossFilter = new PiecewiseLinearFilter();
    detailFilter = new PiecewiseLinearFilter();
    noise;
    sampler;
    lods = [];
    tileTemplate = null;
    material;
    registered = false;
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
        this.sampler = this.createSampler();
        this.material = this.createMaterial();
        this.createLods();
        this._beforeRender = () => this.update();
        scene.registerBeforeRender(this._beforeRender);
    }
    sceneDispose() {
        if (this.owner && this._beforeRender) {
            this.owner.scene.unregisterBeforeRender(this._beforeRender);
        }
        for (const lod of this.lods) {
            for (const tile of lod.tiles)
                tile.mesh.dispose();
        }
        this.lods = [];
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
    createLods() {
        const attrs = this;
        const levels = Math.max(1, attrs.lodLevels);
        const grid = attrs.hiResGrid;
        const subs = attrs.hiResSubdivisions;
        this.tileTemplate = B3dTerrain.buildTileTemplate(subs);
        const hs = attrs.horizScale || 1;
        for (let L = 0; L < levels; L++) {
            const tileSize = lodTileSize(attrs.tileSize, L, hs);
            const tiles = [];
            this.createTilesInto(tiles, grid * grid, subs, tileSize, `lod${L}`);
            this.lods.push({
                level: L,
                tileSize,
                yOffset: -L * LOD_Y_STEP,
                tiles,
                lastCamGridX: Infinity,
                lastCamGridZ: Infinity,
            });
        }
        // Register every tile once (invisible until assigned) so they receive
        // shadows / join reflection lists; the sun's activeDistance gates which
        // actually cast, so the far coarse tiles don't blow up the shadow frustum.
        if (this.owner && !this.registered) {
            const meshes = [];
            for (const lod of this.lods)
                for (const t of lod.tiles)
                    meshes.push(t.mesh);
            this.owner.register({ meshes });
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
    createTilesInto(pool, count, subdivisions, tileSize, prefix) {
        const scene = this.owner.scene;
        const tpl = this.tileTemplate;
        const vertCount = tpl.gridCount + tpl.perim.length;
        for (let i = 0; i < count; i++) {
            const mesh = new BABYLON.Mesh(`terrain-${prefix}-${i}`, scene);
            const vd = new BABYLON.VertexData();
            vd.positions = new Float32Array(vertCount * 3);
            vd.normals = new Float32Array(vertCount * 3);
            vd.indices = tpl.allIndices;
            vd.applyToMesh(mesh, true); // updatable
            mesh.material = this.material;
            mesh.receiveShadows = true;
            mesh.isVisible = false;
            mesh.position.y = -10000;
            pool.push({ mesh, gridX: Infinity, gridZ: Infinity, assigned: false });
        }
    }
    // World coverage square of a level's tile grid given the camera position: the
    // snapped centre and the half-extent (centre ± half on each axis).
    levelCoverage(tileSize, camX, camZ) {
        return {
            cx: cellIndex(camX, tileSize) * tileSize,
            cz: cellIndex(camZ, tileSize) * tileSize,
            half: coverageHalf(this.hiResGrid, tileSize),
        };
    }
    // --- Update loop ---
    update() {
        if (this.owner == null)
            return;
        const camera = this.owner.scene.activeCamera;
        if (camera == null)
            return;
        const attrs = this;
        // WORLD position — the active camera is often parented (e.g. an aircraft's
        // chase cam), so `.position` is a constant local offset. globalPosition is the
        // real point to stream the terrain around.
        const camX = camera.globalPosition.x;
        const camZ = camera.globalPosition.z;
        // Floating origin reset — rebase on the COARSEST tile so every level's grid
        // stays integer-aligned after the shift. The shift is a whole coarsest-tile,
        // so the trigger distance MUST exceed the coarsest tile size — otherwise the
        // shift rounds to 0, resetOrigin no-ops, and update() returns here without
        // streaming, starving the terrain (a param change mid-flight then blanks it).
        const coarsest = this.lods.length
            ? this.lods[this.lods.length - 1].tileSize
            : attrs.tileSize;
        const resetDist = Math.max(attrs.originResetThreshold, coarsest);
        const distSq = camX * camX + camZ * camZ;
        if (distSq > resetDist * resetDist) {
            this.resetOrigin(camX, camZ, camera);
            return;
        }
        // Recenter threshold (sample-space drift, for the game layer to handle).
        const totalTravel = Math.sqrt((this.originOffsetX + camX) * (this.originOffsetX + camX) +
            (this.originOffsetZ + camZ) * (this.originOffsetZ + camZ));
        if (totalTravel > attrs.maxTravelDistance) {
            this.dispatchEvent(new CustomEvent('recenter-needed', {
                bubbles: true,
                detail: { distance: totalTravel },
            }));
        }
        // Stream each LOD level around the camera. Each level snaps to its own tile
        // grid, so coarser levels only restream a quarter as often.
        for (const lod of this.lods) {
            const gx = cellIndex(camX, lod.tileSize);
            const gz = cellIndex(camZ, lod.tileSize);
            if (gx !== lod.lastCamGridX || gz !== lod.lastCamGridZ) {
                lod.lastCamGridX = gx;
                lod.lastCamGridZ = gz;
                this.assignLod(lod, gx, gz, camX, camZ);
            }
        }
    }
    assignLod(lod, camGridX, camGridZ, camX, camZ) {
        const hiHalf = Math.floor(this.hiResGrid / 2);
        // The finer level (k−1) this level nests around. Tiles fully inside its
        // coverage are hidden (the finer level draws them); the rest form the ring.
        // Kept tiles overlap the finer edge slightly so there's never a gap — the
        // per-tile skirts + finer-on-top yOffset hide the transition.
        const finer = lod.level > 0 ? this.levelCoverage(lod.tileSize / 2, camX, camZ) : null;
        const half = lod.tileSize / 2;
        const needed = [];
        for (let dx = -hiHalf; dx <= hiHalf; dx++) {
            for (let dz = -hiHalf; dz <= hiHalf; dz++) {
                const gx = camGridX + dx;
                const gz = camGridZ + dz;
                if (finer) {
                    const c = tileCenter(gx, gz, lod.tileSize);
                    // Fully inside the finer coverage → skip (the finer level covers it).
                    if (spanInside(c.x, half, finer.cx, finer.half) &&
                        spanInside(c.z, half, finer.cz, finer.half)) {
                        continue;
                    }
                }
                needed.push({ gx, gz });
            }
        }
        this.reassignPool(lod, needed);
    }
    reassignPool(lod, needed) {
        const subdivisions = this.hiResSubdivisions;
        const pool = lod.tiles;
        const isNeeded = (tile) => needed.some((n) => n.gx === tile.gridX && n.gz === tile.gridZ);
        const occupied = new Set();
        for (const tile of pool) {
            if (tile.assigned && isNeeded(tile)) {
                occupied.add(`${tile.gridX},${tile.gridZ}`);
            }
        }
        const stillNeeded = needed.filter((n) => !occupied.has(`${n.gx},${n.gz}`));
        const freeTiles = pool.filter((tile) => !tile.assigned || !isNeeded(tile));
        // Park any free tile that's no longer needed (so culled tiles disappear).
        for (const tile of freeTiles) {
            tile.assigned = false;
            tile.mesh.isVisible = false;
        }
        for (let i = 0; i < stillNeeded.length && i < freeTiles.length; i++) {
            const tile = freeTiles[i];
            const { gx, gz } = stillNeeded[i];
            tile.gridX = gx;
            tile.gridZ = gz;
            tile.assigned = true;
            this.generateTileMesh(tile, subdivisions, lod.tileSize, lod.yOffset);
        }
    }
    // Ensure all normals point upward (positive Y) — terrain is a heightfield
    static ensureNormalsUp(normals) {
        for (let i = 1; i < normals.length; i += 3) {
            if (normals[i] < 0) {
                normals[i - 1] = -normals[i - 1];
                normals[i] = -normals[i];
                normals[i + 1] = -normals[i + 1];
            }
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
    generateTileMesh(tile, subdivisions, tileSize, yOffset) {
        const mesh = tile.mesh;
        const tpl = this.tileTemplate;
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (positions == null || normals == null)
            return;
        const vertsPerSide = subdivisions + 1;
        const center = tileCenter(tile.gridX, tile.gridZ, tileSize);
        // 1. Heightfield vertices at their true sampled heights. Each vertex samples
        //    heightAt at exactly the world point it is placed — placement (mesh
        //    position = tile centre) + local offset == the sampled coordinate — so
        //    the surface is always self-consistent (see terrain-grid.test).
        for (let iz = 0; iz < vertsPerSide; iz++) {
            const wz = vertexWorld(tile.gridZ, iz, subdivisions, tileSize, true);
            const localZ = wz - center.z;
            for (let ix = 0; ix < vertsPerSide; ix++) {
                const wx = vertexWorld(tile.gridX, ix, subdivisions, tileSize);
                const localX = wx - center.x;
                const height = this.heightAt(wx, wz);
                const idx = (iz * vertsPerSide + ix) * 3;
                positions[idx] = localX;
                positions[idx + 1] = height;
                positions[idx + 2] = localZ;
            }
        }
        // 2. Normals from the HEIGHTFIELD ONLY (grid triangles) — so the skirt, which
        //    shares these, is shaded as if the terrain simply continued.
        BABYLON.VertexData.ComputeNormals(positions, tpl.gridIndices, normals);
        B3dTerrain.ensureNormalsUp(normals);
        // 3. Skirt vertices: same XZ as their parent perimeter vertex, dropped
        //    straight down; normal copied from the parent (the "lie") so the vertical
        //    band reads as ground, not a wall — plugging any crack to a neighbour.
        const attrs = this;
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
        mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        mesh.refreshBoundingInfo();
        // yOffset (a few cm per level, coarser = lower) keeps a finer tile in front
        // of the coarse one where they overlap — no z-fighting.
        mesh.position.set(center.x, yOffset, center.z);
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
        // Rebase on the COARSEST tile size so the shift is a whole number of tiles at
        // every level — keeps all the LOD grids aligned through the reset.
        const coarsest = this.lods.length
            ? this.lods[this.lods.length - 1].tileSize
            : this.tileSize;
        const shiftX = Math.round(camX / coarsest) * coarsest;
        const shiftZ = Math.round(camZ / coarsest) * coarsest;
        for (const lod of this.lods) {
            const gridShiftX = shiftX / lod.tileSize;
            const gridShiftZ = shiftZ / lod.tileSize;
            for (const tile of lod.tiles) {
                tile.mesh.position.x -= shiftX;
                tile.mesh.position.z -= shiftZ;
                if (tile.assigned) {
                    tile.gridX -= gridShiftX;
                    tile.gridZ -= gridShiftZ;
                }
            }
            lod.lastCamGridX = Infinity;
            lod.lastCamGridZ = Infinity;
        }
        // Shift whatever actually carries the camera through the world: its parent
        // (e.g. the aircraft) if parented, else the camera itself. The controller
        // keeps integrating from the shifted position, so it's seamless.
        const carrier = camera.parent ?? camera;
        carrier.position.x -= shiftX;
        carrier.position.z -= shiftZ;
        this.originOffsetX += shiftX;
        this.originOffsetZ += shiftZ;
    }
    // Reset sample origin — call after a visual discontinuity
    recenter() {
        this.worldU = 0;
        this.worldV = 0;
        this.originOffsetX = 0;
        this.originOffsetZ = 0;
        for (const lod of this.lods) {
            lod.lastCamGridX = Infinity;
            lod.lastCamGridZ = Infinity;
        }
    }
    // Rebuild everything after a parameter change. horizScale rescales the tiles
    // (changing extent + grid), so we recompute each level's tileSize, park all
    // tiles, and restream fresh — this covers both noise changes and scale changes.
    regenerate() {
        const attrs = this;
        if (this.material)
            this.material.wireframe = attrs.wireframe;
        const hs = attrs.horizScale || 1;
        for (const lod of this.lods) {
            lod.tileSize = lodTileSize(attrs.tileSize, lod.level, hs);
            for (const tile of lod.tiles) {
                tile.assigned = false;
                tile.mesh.isVisible = false;
            }
            lod.lastCamGridX = Infinity;
            lod.lastCamGridZ = Infinity;
        }
        this.update();
    }
}
export const b3dTerrain = B3dTerrain.elementCreator({
    tag: 'tosi-b3d-terrain',
});
//# sourceMappingURL=b3d-terrain.js.map