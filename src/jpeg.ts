/*#
# jpeg

**A JPEG read with no engine**: the picture as RGBA bytes, the same
`RgbaImage` that `pngDecode` gives, so a garment's JPEG texture
can be recoloured ([cloth-bake](/cloth-bake/)) and written into an export on
a server, in a worker or in another engine's page.

```javascript
import { jpegDecode, decodeImage } from 'tosijs-3d/jpeg'
const shirt = jpegDecode(bytes) // { width, height, data }
const any = decodeImage(bytes) // a PNG or a JPEG, by its first bytes
```

It reads baseline and progressive JPEGs, grey or colour (YCbCr, or RGB when
the file says so), with any chroma subsampling and restart markers: every
JPEG among MakeHuman's garment textures. Chroma is upsampled with the
triangle filter libjpeg uses, so colours agree with a browser's to a level
or two. Arithmetic coding, 12-bit samples, lossless JPEG and CMYK throw,
naming what they found.

Pure: no DOM, no canvas.
*/
/*{ "parent": "character-core", "order": 39 }*/

import { pngDecode, type RgbaImage } from './png.js'

// The k-th coefficient in zigzag order is this one in an 8×8 block.
const ZIGZAG = Int32Array.from([
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40,
  48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29,
  22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54,
  47, 55, 62, 63,
])

// IDCT basis: COS[x * 8 + u] = c(u) cos((2x + 1) u π / 16) / 2.
const COS = new Float32Array(64)
for (let x = 0; x < 8; x++)
  for (let u = 0; u < 8; u++)
    COS[x * 8 + u] =
      ((u === 0 ? Math.SQRT1_2 : 1) *
        Math.cos(((2 * x + 1) * u * Math.PI) / 16)) /
      2

interface Huffman {
  maxcode: Int32Array
  valptr: Int32Array
  mincode: Int32Array
  values: Uint8Array
}

function huffman(counts: Uint8Array, values: Uint8Array): Huffman {
  const maxcode = new Int32Array(17).fill(-1)
  const valptr = new Int32Array(17)
  const mincode = new Int32Array(17)
  let code = 0
  let k = 0
  for (let l = 1; l <= 16; l++) {
    valptr[l] = k
    mincode[l] = code
    code += counts[l - 1]
    k += counts[l - 1]
    if (counts[l - 1]) maxcode[l] = code - 1
    code <<= 1
  }
  return { maxcode, valptr, mincode, values }
}

interface Component {
  id: number
  h: number
  v: number
  tq: number
  /** Blocks across and down that hold picture. */
  bpl: number
  bpc: number
  /** Blocks across as allocated (whole MCUs). */
  stride: number
  coefficients: Int16Array
  pred: number
  dc?: Huffman
  ac?: Huffman
}

/** Bits of entropy-coded data, with stuffed bytes removed; a marker reads as zeros. */
class Bits {
  bits = 0
  count = 0
  constructor(public data: Uint8Array, public pos: number) {}
  bit(): number {
    if (this.count === 0) {
      const d = this.data
      if (this.pos >= d.length) return 0
      const b = d[this.pos]
      if (b === 0xff) {
        const next = d[this.pos + 1]
        if (next !== 0) return 0 // a marker: the scan's data has ended
        this.pos += 2
      } else this.pos++
      this.bits = b
      this.count = 8
    }
    this.count--
    return (this.bits >> this.count) & 1
  }
  receive(n: number): number {
    let v = 0
    for (let i = 0; i < n; i++) v = (v << 1) | this.bit()
    return v
  }
  /** A signed value of `n` bits. */
  extend(n: number): number {
    if (n === 0) return 0
    const v = this.receive(n)
    return v < 1 << (n - 1) ? v - (1 << n) + 1 : v
  }
  decode(t: Huffman): number {
    let code = this.bit()
    let l = 1
    while (code > t.maxcode[l]) {
      if (++l > 16) throw new Error('jpegDecode: bad Huffman code')
      code = (code << 1) | this.bit()
    }
    return t.values[t.valptr[l] + code - t.mincode[l]]
  }
  /** Past a restart marker. */
  restart() {
    this.count = 0
    const d = this.data
    while (this.pos < d.length - 1) {
      if (
        d[this.pos] === 0xff &&
        d[this.pos + 1] >= 0xd0 &&
        d[this.pos + 1] <= 0xd7
      ) {
        this.pos += 2
        return
      }
      this.pos++
    }
  }
}

/** Read a JPEG (baseline or progressive, Huffman-coded, 8-bit) as RGBA. */
export function jpegDecode(jpeg: Uint8Array): RgbaImage {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8)
    throw new Error('jpegDecode: not a JPEG')
  const quant: Int32Array[] = []
  const dcTables: Huffman[] = []
  const acTables: Huffman[] = []
  let components: Component[] = []
  let width = 0
  let height = 0
  let progressive = false
  let restartInterval = 0
  let adobeTransform = -1
  let hmax = 1
  let vmax = 1
  let mcusX = 0
  let mcusY = 0
  let pos = 2
  const u16 = (p: number) => (jpeg[p] << 8) | jpeg[p + 1]

  while (pos < jpeg.length) {
    if (jpeg[pos] !== 0xff) {
      pos++
      continue
    }
    const marker = jpeg[pos + 1]
    if (marker === 0xff) {
      pos++
      continue
    }
    pos += 2
    if (marker === 0xd9) break // EOI
    if (
      marker === 0xd8 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    )
      continue
    const length = u16(pos)
    const end = pos + length
    let p = pos + 2
    if (marker === 0xdb) {
      while (p < end) {
        const pq = jpeg[p] >> 4
        const tq = jpeg[p] & 15
        p++
        const table = new Int32Array(64)
        for (let k = 0; k < 64; k++) {
          table[ZIGZAG[k]] = pq ? u16(p) : jpeg[p]
          p += pq ? 2 : 1
        }
        quant[tq] = table
      }
    } else if (marker === 0xc4) {
      while (p < end) {
        const tc = jpeg[p] >> 4
        const th = jpeg[p] & 15
        const counts = jpeg.subarray(p + 1, p + 17)
        let n = 0
        for (const c of counts) n += c
        const values = jpeg.slice(p + 17, p + 17 + n)
        ;(tc ? acTables : dcTables)[th] = huffman(counts, values)
        p += 17 + n
      }
    } else if (marker === 0xdd) {
      restartInterval = u16(p)
    } else if (marker === 0xee) {
      if (String.fromCharCode(...jpeg.subarray(p, p + 5)) === 'Adobe')
        adobeTransform = jpeg[p + 11]
    } else if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      progressive = marker === 0xc2
      if (jpeg[p] !== 8)
        throw new Error(`jpegDecode: ${jpeg[p]}-bit samples are not supported`)
      height = u16(p + 1)
      width = u16(p + 3)
      if (!height)
        throw new Error('jpegDecode: no height (DNL is not supported)')
      const n = jpeg[p + 5]
      components = []
      for (let i = 0; i < n; i++) {
        const q = p + 6 + i * 3
        components.push({
          id: jpeg[q],
          h: jpeg[q + 1] >> 4,
          v: jpeg[q + 1] & 15,
          tq: jpeg[q + 2],
          bpl: 0,
          bpc: 0,
          stride: 0,
          coefficients: new Int16Array(0),
          pred: 0,
        })
      }
      hmax = Math.max(...components.map((c) => c.h))
      vmax = Math.max(...components.map((c) => c.v))
      mcusX = Math.ceil(width / (8 * hmax))
      mcusY = Math.ceil(height / (8 * vmax))
      for (const c of components) {
        c.bpl = Math.ceil(Math.ceil((width * c.h) / hmax) / 8)
        c.bpc = Math.ceil(Math.ceil((height * c.v) / vmax) / 8)
        c.stride = mcusX * c.h
        c.coefficients = new Int16Array(c.stride * mcusY * c.v * 64)
      }
    } else if (
      marker >= 0xc3 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      const kind =
        marker >= 0xc9 ? 'arithmetic-coded' : 'lossless or hierarchical'
      throw new Error(
        `jpegDecode: ${kind} JPEG (SOF${marker - 0xc0}) is not supported`
      )
    } else if (marker === 0xda) {
      if (!components.length) throw new Error('jpegDecode: scan before frame')
      const ns = jpeg[p]
      const scan: Component[] = []
      for (let i = 0; i < ns; i++) {
        const id = jpeg[p + 1 + i * 2]
        const t = jpeg[p + 2 + i * 2]
        const c = components.find((c) => c.id === id)
        if (!c) throw new Error(`jpegDecode: scan names component ${id}`)
        c.dc = dcTables[t >> 4]
        c.ac = acTables[t & 15]
        scan.push(c)
      }
      const q = p + 1 + ns * 2
      const ss = jpeg[q]
      const se = jpeg[q + 1]
      const ah = jpeg[q + 2] >> 4
      const al = jpeg[q + 2] & 15
      pos = decodeScan(new Bits(jpeg, end), scan, {
        progressive,
        ss,
        se,
        ah,
        al,
        restartInterval,
        mcusX,
        mcusY,
      })
      continue
    }
    pos = end
  }
  if (!components.length) throw new Error('jpegDecode: no frame')
  if (components.length !== 1 && components.length !== 3)
    throw new Error(
      `jpegDecode: ${components.length} components (CMYK) is not supported`
    )

  // Each component's samples, block by block through the IDCT.
  const planes = components.map((c) => {
    const table = quant[c.tq]
    if (!table) throw new Error(`jpegDecode: no quantisation table ${c.tq}`)
    const w = c.stride * 8
    const plane = new Uint8Array(w * mcusY * c.v * 8)
    const block = new Float32Array(64)
    const tmp = new Float32Array(64)
    const rows = mcusY * c.v
    for (let by = 0; by < rows; by++)
      for (let bx = 0; bx < c.stride; bx++) {
        const at = (by * c.stride + bx) * 64
        for (let i = 0; i < 64; i++)
          block[i] = c.coefficients[at + i] * table[i]
        idct(block, tmp)
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) {
            const v = Math.round(block[y * 8 + x] + 128)
            plane[(by * 8 + y) * w + bx * 8 + x] = v < 0 ? 0 : v > 255 ? 255 : v
          }
      }
    return { plane, w, h: rows * 8, sx: c.h / hmax, sy: c.v / vmax }
  })

  const data = new Uint8Array(width * height * 4)
  // A sample at full resolution: bilinear between sample centres, the
  // triangle filter libjpeg's fancy upsampling is for 2×.
  const sample = (k: number, x: number, y: number) => {
    const { plane, w, h, sx, sy } = planes[k]
    if (sx === 1 && sy === 1) return plane[y * w + x]
    const fx = Math.min(Math.max((x + 0.5) * sx - 0.5, 0), w - 1)
    const fy = Math.min(Math.max((y + 0.5) * sy - 0.5, 0), h - 1)
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = Math.min(x0 + 1, w - 1)
    const y1 = Math.min(y0 + 1, h - 1)
    const ax = fx - x0
    const ay = fy - y0
    const top = plane[y0 * w + x0] * (1 - ax) + plane[y0 * w + x1] * ax
    const bottom = plane[y1 * w + x0] * (1 - ax) + plane[y1 * w + x1] * ax
    return top * (1 - ay) + bottom * ay
  }
  const rgb =
    components.length === 3 &&
    (adobeTransform === 0 ||
      (components[0].id === 82 &&
        components[1].id === 71 &&
        components[2].id === 66))
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      if (components.length === 1) {
        const g = sample(0, x, y)
        data[o] = data[o + 1] = data[o + 2] = clamp(g)
      } else if (rgb) {
        data[o] = clamp(sample(0, x, y))
        data[o + 1] = clamp(sample(1, x, y))
        data[o + 2] = clamp(sample(2, x, y))
      } else {
        const Y = sample(0, x, y)
        const cb = sample(1, x, y) - 128
        const cr = sample(2, x, y) - 128
        data[o] = clamp(Y + 1.402 * cr)
        data[o + 1] = clamp(Y - 0.344136 * cb - 0.714136 * cr)
        data[o + 2] = clamp(Y + 1.772 * cb)
      }
      data[o + 3] = 255
    }
  return { width, height, data }
}

/** 8×8 inverse DCT in place (rows, then columns). */
function idct(block: Float32Array, tmp: Float32Array) {
  for (let v = 0; v < 8; v++)
    for (let x = 0; x < 8; x++) {
      let s = 0
      for (let u = 0; u < 8; u++) s += COS[x * 8 + u] * block[v * 8 + u]
      tmp[v * 8 + x] = s
    }
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++) {
      let s = 0
      for (let v = 0; v < 8; v++) s += COS[y * 8 + v] * tmp[v * 8 + x]
      block[y * 8 + x] = s
    }
}

interface ScanSpec {
  progressive: boolean
  ss: number
  se: number
  ah: number
  al: number
  restartInterval: number
  mcusX: number
  mcusY: number
}

/** Decode one scan into its components' coefficients; returns where the next marker is. */
function decodeScan(bits: Bits, scan: Component[], s: ScanSpec): number {
  const { ss, se, ah, al } = s
  let eobrun = 0
  const p1 = 1 << al
  const m1 = -1 << al

  const baseline = (c: Component, at: number) => {
    const blk = c.coefficients
    const t = bits.decode(c.dc!)
    c.pred += bits.extend(t)
    blk[at] = c.pred
    for (let k = 1; k < 64; ) {
      const rs = bits.decode(c.ac!)
      const r = rs >> 4
      const n = rs & 15
      if (n === 0) {
        if (r < 15) break
        k += 16
        continue
      }
      k += r
      if (k > 63) break
      blk[at + ZIGZAG[k]] = bits.extend(n)
      k++
    }
  }
  const dcFirst = (c: Component, at: number) => {
    const t = bits.decode(c.dc!)
    c.pred += bits.extend(t)
    c.coefficients[at] = c.pred * p1
  }
  const dcRefine = (c: Component, at: number) => {
    if (bits.bit()) c.coefficients[at] |= p1
  }
  const acFirst = (c: Component, at: number) => {
    if (eobrun > 0) {
      eobrun--
      return
    }
    const blk = c.coefficients
    for (let k = ss; k <= se; ) {
      const rs = bits.decode(c.ac!)
      const r = rs >> 4
      const n = rs & 15
      if (n === 0) {
        if (r < 15) {
          eobrun = (1 << r) - 1 + (r ? bits.receive(r) : 0)
          break
        }
        k += 16
        continue
      }
      k += r
      if (k > 63) break
      blk[at + ZIGZAG[k]] = bits.extend(n) * p1
      k++
    }
  }
  const acRefine = (c: Component, at: number) => {
    const blk = c.coefficients
    const refine = (z: number) => {
      if (bits.bit() && (blk[z] & p1) === 0) blk[z] += blk[z] >= 0 ? p1 : m1
    }
    let k = ss
    if (eobrun <= 0) {
      while (k <= se) {
        const rs = bits.decode(c.ac!)
        let r = rs >> 4
        const n = rs & 15
        let value = 0
        if (n === 0) {
          if (r < 15) {
            eobrun = (1 << r) + (r ? bits.receive(r) : 0)
            break
          }
        } else value = bits.bit() ? p1 : m1
        while (k <= se) {
          const z = at + ZIGZAG[k]
          if (blk[z] !== 0) refine(z)
          else {
            if (r === 0) {
              if (value) blk[z] = value
              k++
              break
            }
            r--
          }
          k++
        }
      }
    }
    if (eobrun > 0) {
      for (; k <= se; k++) {
        const z = at + ZIGZAG[k]
        if (blk[z] !== 0) refine(z)
      }
      eobrun--
    }
  }

  const decode = !s.progressive
    ? baseline
    : ss === 0
    ? ah === 0
      ? dcFirst
      : dcRefine
    : ah === 0
    ? acFirst
    : acRefine

  const single = scan.length === 1
  const c0 = scan[0]
  const total = single ? c0.bpl * c0.bpc : s.mcusX * s.mcusY
  for (const c of scan) c.pred = 0
  for (let m = 0; m < total; m++) {
    if (s.restartInterval && m > 0 && m % s.restartInterval === 0) {
      bits.restart()
      for (const c of scan) c.pred = 0
      eobrun = 0
    }
    if (single) {
      const row = Math.floor(m / c0.bpl)
      const col = m % c0.bpl
      decode(c0, (row * c0.stride + col) * 64)
    } else {
      const mr = Math.floor(m / s.mcusX)
      const mc = m % s.mcusX
      for (const c of scan)
        for (let v = 0; v < c.v; v++)
          for (let h = 0; h < c.h; h++)
            decode(c, ((mr * c.v + v) * c.stride + mc * c.h + h) * 64)
    }
  }
  // On to the next marker (not a restart, not stuffing).
  const d = bits.data
  let p = bits.pos
  while (p < d.length - 1) {
    if (d[p] === 0xff) {
      const next = d[p + 1]
      if (next !== 0 && next !== 0xff && !(next >= 0xd0 && next <= 0xd7))
        return p
    }
    p++
  }
  return d.length
}

/** A PNG or a JPEG as RGBA, by its first bytes. */
export function decodeImage(bytes: Uint8Array): RgbaImage {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegDecode(bytes)
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return pngDecode(bytes)
  throw new Error('decodeImage: neither a PNG nor a JPEG')
}
