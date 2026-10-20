/*#
# seam-material

**A mesh's polygons drawn on it: a flat fill with soft edges.** The look
of a modelling program's front and side views, where you read a shape by its
topology rather than its lighting. The rig tool's orthographic views use it
to line joints up with the mesh.

The edges are drawn in the fragment shader, not as GL lines: each corner of
a triangle carries a barycentric coordinate, the smallest of the three is the
distance to the nearest edge, and `fwidth` keeps the line the same width in
pixels at any zoom, smoothed instead of stair-stepped. Where triangles shrink
to a few pixels across the edges fade, so a distant mesh reads as its fill.
The diagonals that split a quad into triangles are not drawn
(`quadDiagonals` finds the quads again; `{ quads: false }` draws every edge). That needs triangles
that share no corners, so `withBarycentrics(mesh)` unshares them (the mesh's
skin weights come along, so it still bends) and adds the attribute.

```javascript
import { seamMaterial, withBarycentrics, seamOverlay } from 'tosijs-3d'

withBarycentrics(mesh)
mesh.material = seamMaterial(scene)
// or, keeping the mesh as it is: a twin drawn in its place
const seams = seamOverlay(mesh)
seams.dispose()
```

| option | default | |
| --- | --- | --- |
| `fill` | `'#c99ba6'` | the flat colour (a desaturated pink) |
| `line` | `'#ffffff'` | the edges' colour |
| `lineAlpha` | `0.45` | how strongly the edges show |
| `lineWidth` | `1.25` | their width, in pixels |
| `shade` | `0.25` | how much light shapes it (0: perfectly flat) |

A material without the attribute draws as a plain flat one.
*/
/*{ "parent": "inspect-view", "order": 10 }*/
import * as BABYLON from '@babylonjs/core'

/** The vertex attribute that carries each corner's barycentric coordinate. */
export const BARY_KIND = 'b3dBary'

export interface SeamMaterialOptions {
  fill?: string
  line?: string
  lineAlpha?: number
  lineWidth?: number
  shade?: number
}

export class SeamPlugin extends BABYLON.MaterialPluginBase {
  line = new BABYLON.Color3(1, 1, 1)
  lineAlpha = 0.45
  lineWidth = 1.25

  constructor(material: BABYLON.Material) {
    super(material, 'B3dSeam', 200, { B3DSEAM: false })
    this._enable(true)
  }

  getClassName(): string {
    return 'SeamPlugin'
  }

  prepareDefines(
    defines: BABYLON.MaterialDefines,
    _scene: BABYLON.Scene,
    mesh: BABYLON.AbstractMesh
  ): void {
    defines.B3DSEAM = mesh.isVerticesDataPresent(BARY_KIND)
  }

  getAttributes(
    attributes: string[],
    _scene: BABYLON.Scene,
    mesh: BABYLON.AbstractMesh
  ): void {
    if (mesh.isVerticesDataPresent(BARY_KIND)) attributes.push(BARY_KIND)
  }

  getUniforms() {
    return {
      ubo: [
        { name: 'b3dSeamLine', size: 4, type: 'vec4' },
        { name: 'b3dSeamWidth', size: 1, type: 'float' },
      ],
      fragment: `#ifdef B3DSEAM
        uniform vec4 b3dSeamLine;
        uniform float b3dSeamWidth;
      #endif`,
    }
  }

  bindForSubMesh(ubo: BABYLON.UniformBuffer): void {
    ubo.updateFloat4(
      'b3dSeamLine',
      this.line.r,
      this.line.g,
      this.line.b,
      this.lineAlpha
    )
    ubo.updateFloat('b3dSeamWidth', this.lineWidth)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === 'vertex')
      return {
        CUSTOM_VERTEX_DEFINITIONS: `#ifdef B3DSEAM
          attribute vec3 ${BARY_KIND};
          varying vec3 vB3dBary;
        #endif`,
        CUSTOM_VERTEX_MAIN_BEGIN: `#ifdef B3DSEAM
          vB3dBary = ${BARY_KIND};
        #endif`,
      }
    if (shaderType === 'fragment')
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `#ifdef B3DSEAM
          varying vec3 vB3dBary;
        #endif`,
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `#ifdef B3DSEAM
        {
          // Distance to the nearest edge, in pixels, smoothed over one.
          vec3 b3dFw = max(fwidth(vB3dBary), vec3(1e-6));
          vec3 b3dPx = vB3dBary / b3dFw;
          float b3dD = min(min(b3dPx.x, b3dPx.y), b3dPx.z);
          float b3dEdge = 1.0 - smoothstep(b3dSeamWidth - 0.5, b3dSeamWidth + 0.5, b3dD);
          // Triangles a few pixels across are all edge: fade them to fill.
          float b3dSpan = 1.0 / max(max(b3dFw.x, b3dFw.y), b3dFw.z);
          b3dEdge *= smoothstep(4.0, 12.0, b3dSpan);
          color.rgb = mix(color.rgb, b3dSeamLine.rgb, b3dEdge * b3dSeamLine.a);
        }
        #endif`,
      }
    return null
  }
}

/** A flat material that draws the polygon edges of a mesh with barycentrics. */
export function seamMaterial(
  scene: BABYLON.Scene,
  options: SeamMaterialOptions = {}
): BABYLON.StandardMaterial & { seams: SeamPlugin } {
  const m = new BABYLON.StandardMaterial('b3d-seam', scene) as
    BABYLON.StandardMaterial & { seams: SeamPlugin }
  const fill = BABYLON.Color3.FromHexString(options.fill ?? '#c99ba6')
  const shade = Math.min(1, Math.max(0, options.shade ?? 0.25))
  // Mostly its own colour, a little light so the shape still reads.
  m.emissiveColor = fill.scale(1 - shade)
  m.diffuseColor = fill.scale(shade)
  m.specularColor = BABYLON.Color3.Black()
  m.backFaceCulling = false
  const p = new SeamPlugin(m)
  p.line = BABYLON.Color3.FromHexString(options.line ?? '#ffffff')
  p.lineAlpha = options.lineAlpha ?? 0.45
  p.lineWidth = options.lineWidth ?? 1.25
  m.seams = p
  return m
}

/**
 * Which triangle edges are the diagonal of a quad: per triangle, a bit for
 * the edge opposite each corner (1, 2, 4). Meshes arrive triangulated (an
 * OBJ's quads are fans by the time they are loaded), so the quads are found
 * again: two triangles that share an edge which is the LONGEST edge of both,
 * and lie nearly flat together (within `maxDeg`), are one quad, and that
 * edge is hidden. Each triangle pairs once. Corners are matched by position,
 * so split vertices (a UV seam) still meet.
 */
export function quadDiagonals(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  maxDeg = 30
): Uint8Array {
  const tris = Math.floor(indices.length / 3)
  const key = (v: number) =>
    `${Math.round(positions[v * 3] * 1e5)},${Math.round(
      positions[v * 3 + 1] * 1e5
    )},${Math.round(positions[v * 3 + 2] * 1e5)}`
  const ids = new Map<string, number>()
  const id = (v: number) => {
    const k = key(v)
    let i = ids.get(k)
    if (i == null) ids.set(k, (i = ids.size))
    return i
  }
  const corner = new Int32Array(indices.length)
  for (let i = 0; i < indices.length; i++) corner[i] = id(indices[i])
  const P = (t: number, c: number) => {
    const v = indices[t * 3 + c]
    return [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]]
  }
  const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const len2 = (a: number[]) => a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
  const normal = (t: number) => {
    const a = P(t, 0)
    const u = sub(P(t, 1), a)
    const w = sub(P(t, 2), a)
    const n = [
      u[1] * w[2] - u[2] * w[1],
      u[2] * w[0] - u[0] * w[2],
      u[0] * w[1] - u[1] * w[0],
    ]
    const l = Math.sqrt(len2(n)) || 1
    return [n[0] / l, n[1] / l, n[2] / l]
  }
  /** The corner opposite each triangle's longest edge. */
  const longest = new Int8Array(tris)
  const edges = new Map<string, number[]>()
  for (let t = 0; t < tris; t++) {
    let best = 0
    let bestLen = -1
    for (let c = 0; c < 3; c++) {
      const a = (c + 1) % 3
      const b = (c + 2) % 3
      const l = len2(sub(P(t, a), P(t, b)))
      if (l > bestLen) {
        bestLen = l
        best = c
      }
      const ea = corner[t * 3 + a]
      const eb = corner[t * 3 + b]
      const k = ea < eb ? `${ea}:${eb}` : `${eb}:${ea}`
      let list = edges.get(k)
      if (list == null) edges.set(k, (list = []))
      list.push(t * 3 + c)
    }
    longest[t] = best
  }
  const flat = Math.cos((maxDeg * Math.PI) / 180)
  const hidden = new Uint8Array(tris)
  const paired = new Uint8Array(tris)
  for (const list of edges.values()) {
    if (list.length !== 2) continue
    const [ta, ca] = [Math.floor(list[0] / 3), list[0] % 3]
    const [tb, cb] = [Math.floor(list[1] / 3), list[1] % 3]
    if (ta === tb || paired[ta] || paired[tb]) continue
    if (longest[ta] !== ca || longest[tb] !== cb) continue
    const na = normal(ta)
    const nb = normal(tb)
    if (na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2] < flat) continue
    paired[ta] = paired[tb] = 1
    hidden[ta] |= 1 << ca
    hidden[tb] |= 1 << cb
  }
  return hidden
}

/**
 * Give `mesh` its barycentrics: its triangles unshared (every corner its own
 * vertex, skin weights and all) and each corner marked (1,0,0), (0,1,0) or
 * (0,0,1). An edge to hide (a quad's diagonal, see `quadDiagonals`) has the
 * coordinate that measures it held at 1, so it is never near. Its geometry
 * is made its own first, so a clone's original keeps its shared vertices.
 */
export function withBarycentrics(
  mesh: BABYLON.Mesh,
  options: { quads?: boolean } = {}
): BABYLON.Mesh {
  mesh.makeGeometryUnique()
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
  const indices = mesh.getIndices()
  const hide =
    options.quads !== false && positions != null && indices != null
      ? quadDiagonals(positions, indices)
      : null
  mesh.convertToUnIndexedMesh()
  const n = mesh.getTotalVertices()
  const bary = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    bary[i * 3 + (i % 3)] = 1
    const h = hide?.[Math.floor(i / 3)] ?? 0
    for (let c = 0; c < 3; c++) if (h & (1 << c)) bary[i * 3 + c] = 1
  }
  mesh.setVerticesData(BARY_KIND, bary, false, 3)
  return mesh
}
