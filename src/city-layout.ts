/*#
# city-layout

**A city's plan from a grid and a seed**: where the roads run, the blocks
between them, and the lots in each block that a building stands on. It knows
cells, never metres or models, so the same plan can be dressed with any kit
on any grid. Pure and seeded: the same options give the same city.

## Demo

```js
import { cityLayout } from 'tosijs-3d'
import { elements, svgElements } from 'tosijs'

const { svg, rect } = svgElements
const { button, div } = elements
const CELL = 14
let seed = 1

function draw() {
  const city = cityLayout({ width: 48, depth: 30, seed })
  const flip = (z, d = 1) => (city.depth - z - d) * CELL // north is up
  const cells = (r, fill) =>
    rect({ x: r.x * CELL, y: flip(r.z, r.depth), width: r.width * CELL, height: r.depth * CELL, fill, stroke: '#0004' })
  return svg(
    { viewBox: `0 0 ${city.width * CELL} ${city.depth * CELL}`, style: 'width: 100%; height: auto; background: #444' },
    ...city.roads.map((r) => rect({ x: r.x * CELL, y: flip(r.z), width: CELL, height: CELL, fill: '#555' })),
    ...city.yards.map((y) => cells(y, '#6a9a5b')),
    ...city.lots.map((l, i) => cells(l, `hsl(${(i * 47) % 360} 45% ${l.corner ? 72 : 62}%)`)),
    // A tick on each lot's street side.
    ...city.lots.map((l) => {
      const mid = { x: (l.x + l.width / 2) * CELL, y: flip(l.z, l.depth) + (l.depth * CELL) / 2 }
      const reach = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[l.front]
      const half = { x: (l.width * CELL) / 2, y: (l.depth * CELL) / 2 }
      return svgElements.line({ x1: mid.x, y1: mid.y, x2: mid.x + reach[0] * half.x, y2: mid.y + reach[1] * half.y, stroke: '#0006' })
    })
  )
}

const map = div(draw())
preview.append(
  map,
  button({ onClick() { seed += 1; map.replaceChildren(draw()) } }, 'another city')
)
```

Grey is road, each coloured patch a lot (corner lots lighter), green the yards
left in the middle of big blocks; the tick on each lot points at its street.

```javascript
const city = cityLayout({ width: 24, depth: 24, seed: 7 })
city.roads   // [{ x, z, piece: 'tee', turns: 1, mask: 7 }, …]
city.blocks  // [{ x, z, width, depth }, …]
city.lots    // [{ x, z, width, depth, front: 'n', corner: false, block: 3 }, …]
```

## How it is made

A city is a hierarchy, so it is made top down rather than tile by tile. The
whole area is ringed by a road, then split by a road across it, and each side
split again, until every piece is no bigger than `blockMax` cells. Each split
road runs from one existing road to another, so **every road is connected**
by construction (and the tests check it). What is left between the roads are
the blocks.

Each block is then cut into lots along its edges: a corner lot at each
corner, and lots of `lotWidth` cells along each side, `lotDepth` deep, so
**every lot faces a road**. Whatever is left in the middle of a big block is
its `yards` (a courtyard, a park, a car park).

## Road pieces

Each road cell gets its piece from which of its four neighbours are road:
`end` (one), `straight` (two opposite), `bend` (two adjacent), `tee`
(three), `cross` (four), or `single` (none). `turns` is how many quarter
turns, clockwise seen from above (north to east), take the piece from its
canonical orientation to this one:

| piece | canonical: connects |
|-------|---------------------|
| `end` | north |
| `straight` | north and south |
| `bend` | north and east |
| `tee` | north, east and south |
| `cross` | all four |

North is +Z and east is +X, cell (0, 0) at the south-west corner. Which way a
kit's model faces is the dressing's business: its manifest says how to turn
each piece to this canonical orientation.

## Options

| Option | Default | Meaning |
|--------|---------|---------|
| `width`, `depth` | | The grid, cells (x and z) |
| `seed` | `1` | Same seed, same city |
| `blockMin` | `3` | A split never leaves a block narrower than this, cells |
| `blockMax` | `6` | Blocks are split until no wider than this, cells |
| `lotWidth` | `[1, 2]` | Lots along a street, cells wide (a range) |
| `lotDepth` | `2` | How deep a lot runs back from the street, cells (less in a narrow block) |
| `ring` | `true` | A road round the edge of the whole grid (without it, lots on the outer edge face the edge, not a street) |
*/
/*{ "parent": "terrain", "order": 60 }*/

import { PRNG } from './mersenne-twister.js'

/** A side of a cell: north is +Z, east is +X. */
export type Side = 'n' | 'e' | 's' | 'w'
export type RoadPiece = 'single' | 'end' | 'straight' | 'bend' | 'tee' | 'cross'

export interface RoadCell {
  x: number
  z: number
  piece: RoadPiece
  /** Quarter turns clockwise (north to east) from the piece's canonical orientation. */
  turns: 0 | 1 | 2 | 3
  /** Which neighbours are road, as a mask: n 1, e 2, s 4, w 8. */
  mask: number
}

export interface Rect {
  x: number
  z: number
  width: number
  depth: number
}

export interface Lot extends Rect {
  /** The side that faces the street. */
  front: Side
  /** A corner lot faces two streets: `front` and `side`. */
  corner: boolean
  side?: Side
  /** Index into `blocks`. */
  block: number
}

export interface CityLayoutOptions {
  width: number
  depth: number
  seed?: number
  blockMin?: number
  blockMax?: number
  lotWidth?: [number, number]
  lotDepth?: number
  ring?: boolean
}

export interface CityLayout {
  width: number
  depth: number
  /** Row-major (`z * width + x`): true where a cell is road. */
  road: boolean[]
  roads: RoadCell[]
  blocks: Rect[]
  lots: Lot[]
  /** What is left in the middle of a block, one per block that has some. */
  yards: (Rect & { block: number })[]
}

export const SIDE_BIT: Record<Side, number> = { n: 1, e: 2, s: 4, w: 8 }
const CANONICAL: Record<Exclude<RoadPiece, 'single'>, number> = {
  end: 1,
  straight: 1 | 4,
  bend: 1 | 2,
  tee: 1 | 2 | 4,
  cross: 15,
}

/** A mask turned a quarter clockwise: n becomes e, e becomes s, and so on. */
export const turnMask = (mask: number, turns: number): number => {
  let m = mask
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15
  return m
}

/** The road piece and its turns for a cell whose road neighbours are `mask`. */
export function roadPiece(mask: number): { piece: RoadPiece; turns: 0 | 1 | 2 | 3 } {
  const count = [1, 2, 4, 8].filter((b) => mask & b).length
  if (count === 0) return { piece: 'single', turns: 0 }
  const piece: RoadPiece =
    count === 1 ? 'end' : count === 3 ? 'tee' : count === 4 ? 'cross' : mask === 5 || mask === 10 ? 'straight' : 'bend'
  for (let t = 0; t < 4; t++) {
    if (turnMask(CANONICAL[piece as Exclude<RoadPiece, 'single'>], t) === mask) return { piece, turns: t as 0 | 1 | 2 | 3 }
  }
  return { piece, turns: 0 }
}

export function cityLayout(options: CityLayoutOptions): CityLayout {
  const width = Math.max(1, Math.floor(options.width))
  const depth = Math.max(1, Math.floor(options.depth))
  const rng = new PRNG(options.seed ?? 1)
  const blockMin = Math.max(1, options.blockMin ?? 3)
  const blockMax = Math.max(blockMin, options.blockMax ?? 6)
  const [lotLo, lotHi] = options.lotWidth ?? [1, 2]
  const lotDepth = Math.max(1, options.lotDepth ?? 2)
  const road = new Array<boolean>(width * depth).fill(false)
  const at = (x: number, z: number) => x >= 0 && z >= 0 && x < width && z < depth && road[z * width + x]
  const pave = (x: number, z: number) => {
    if (x >= 0 && z >= 0 && x < width && z < depth) road[z * width + x] = true
  }

  // The ring, then split what is inside it.
  const ring = options.ring ?? true
  const inner: Rect = ring
    ? { x: 1, z: 1, width: width - 2, depth: depth - 2 }
    : { x: 0, z: 0, width, depth }
  if (ring) {
    for (let x = 0; x < width; x++) {
      pave(x, 0)
      pave(x, depth - 1)
    }
    for (let z = 0; z < depth; z++) {
      pave(0, z)
      pave(width - 1, z)
    }
  }

  const blocks: Rect[] = []
  const split = (r: Rect) => {
    if (r.width <= 0 || r.depth <= 0) return
    // Split across the longer side while it is too big and both halves can be blocks.
    const canX = r.width > blockMax && r.width >= 2 * blockMin + 1
    const canZ = r.depth > blockMax && r.depth >= 2 * blockMin + 1
    if (!canX && !canZ) {
      blocks.push(r)
      return
    }
    const alongX = canX && (!canZ || r.width > r.depth || (r.width === r.depth && rng.value() < 0.5))
    if (alongX) {
      // A road running north-south at column c.
      const c = r.x + rng.range(blockMin, r.width - blockMin - 1)
      for (let z = r.z; z < r.z + r.depth; z++) pave(c, z)
      split({ x: r.x, z: r.z, width: c - r.x, depth: r.depth })
      split({ x: c + 1, z: r.z, width: r.x + r.width - c - 1, depth: r.depth })
    } else {
      const c = r.z + rng.range(blockMin, r.depth - blockMin - 1)
      for (let x = r.x; x < r.x + r.width; x++) pave(x, c)
      split({ x: r.x, z: r.z, width: r.width, depth: c - r.z })
      split({ x: r.x, z: c + 1, width: r.width, depth: r.z + r.depth - c - 1 })
    }
  }
  split(inner)

  const roads: RoadCell[] = []
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      if (!at(x, z)) continue
      const mask =
        (at(x, z + 1) ? 1 : 0) | (at(x + 1, z) ? 2 : 0) | (at(x, z - 1) ? 4 : 0) | (at(x - 1, z) ? 8 : 0)
      roads.push({ x, z, mask, ...roadPiece(mask) })
    }
  }

  // Lots round the edge of each block, all facing a street.
  const lots: Lot[] = []
  const yards: (Rect & { block: number })[] = []
  blocks.forEach((b, block) => {
    const dz = Math.min(lotDepth, Math.floor(b.depth / 2)) || b.depth
    const dx = Math.min(lotDepth, Math.floor(b.width / 2)) || b.width
    const add = (lot: Omit<Lot, 'block'>) => {
      if (lot.width > 0 && lot.depth > 0) lots.push({ ...lot, block })
    }
    // A block one cell deep or wide is a single row of lots.
    if (b.depth <= 1 || b.width <= 1) {
      const long = b.width >= b.depth
      const n = long ? b.width : b.depth
      for (let i = 0; i < n; ) {
        const w = Math.min(n - i, rng.range(lotLo, lotHi))
        add(
          long
            ? { x: b.x + i, z: b.z, width: w, depth: b.depth, front: 's', corner: false }
            : { x: b.x, z: b.z + i, width: b.width, depth: w, front: 'w', corner: false }
        )
        i += w
      }
      return
    }
    const run = (from: number, to: number, place: (i: number, w: number) => Omit<Lot, 'block'>) => {
      for (let i = from; i < to; ) {
        const w = Math.min(to - i, rng.range(lotLo, lotHi))
        add(place(i, w))
        i += w
      }
    }
    const x0 = b.x
    const x1 = b.x + b.width
    const z0 = b.z
    const z1 = b.z + b.depth
    // Corners: two streets each.
    add({ x: x0, z: z0, width: dx, depth: dz, front: 's', side: 'w', corner: true })
    add({ x: x1 - dx, z: z0, width: dx, depth: dz, front: 's', side: 'e', corner: true })
    add({ x: x0, z: z1 - dz, width: dx, depth: dz, front: 'n', side: 'w', corner: true })
    add({ x: x1 - dx, z: z1 - dz, width: dx, depth: dz, front: 'n', side: 'e', corner: true })
    // Along the south and north streets, between the corners.
    run(x0 + dx, x1 - dx, (i, w) => ({ x: i, z: z0, width: w, depth: dz, front: 's', corner: false }))
    run(x0 + dx, x1 - dx, (i, w) => ({ x: i, z: z1 - dz, width: w, depth: dz, front: 'n', corner: false }))
    // Along the west and east streets.
    run(z0 + dz, z1 - dz, (i, w) => ({ x: x0, z: i, width: dx, depth: w, front: 'w', corner: false }))
    run(z0 + dz, z1 - dz, (i, w) => ({ x: x1 - dx, z: i, width: dx, depth: w, front: 'e', corner: false }))
    const yard = { x: x0 + dx, z: z0 + dz, width: b.width - 2 * dx, depth: b.depth - 2 * dz, block }
    if (yard.width > 0 && yard.depth > 0) yards.push(yard)
  })

  return { width, depth, road, roads, blocks, lots, yards }
}
