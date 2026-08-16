var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/sdf-lattice.ts
function latticeHash(ix, iy, iz, seed = 0, channel = 0) {
  let h = Math.imul(ix | 0, 668265261) ^ Math.imul(iy | 0, 374761393);
  h = (h ^ Math.imul(iz | 0, 2654435761)) >>> 0;
  h = (h ^ Math.imul(seed | 0, 2246822507)) >>> 0;
  h = (h ^ Math.imul(channel + 1, 3266489909)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 625341585) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
function latticePoint(ix, iy, iz, cfg, out = { x: 0, y: 0, z: 0 }) {
  const L = cfg.spacing;
  const j = (cfg.jitter ?? 0) * L;
  const seed = cfg.seed ?? 0;
  out.x = ix * L + (j > 0 ? (latticeHash(ix, iy, iz, seed, 0) - 0.5) * j : 0);
  out.y = iy * L + (j > 0 ? (latticeHash(ix, iy, iz, seed, 1) - 0.5) * j : 0);
  out.z = iz * L + (j > 0 ? (latticeHash(ix, iy, iz, seed, 2) - 0.5) * j : 0);
  return out;
}
function extractChunk(field, chunk, cfg) {
  const c0x = chunk.ix - 1;
  const c0y = chunk.iy - 1;
  const c0z = chunk.iz - 1;
  const cnx = chunk.nx + 2;
  const cny = chunk.ny + 2;
  const cnz = chunk.nz + 2;
  const pnx = cnx + 1;
  const pny = cny + 1;
  const pnz = cnz + 1;
  const values = new Float64Array(pnx * pny * pnz);
  const px = new Float64Array(pnx * pny * pnz);
  const py = new Float64Array(pnx * pny * pnz);
  const pz = new Float64Array(pnx * pny * pnz);
  const p = { x: 0, y: 0, z: 0 };
  const pIndex = (a, b, c) => (c * pny + b) * pnx + a;
  for (let c = 0;c < pnz; c++) {
    for (let b = 0;b < pny; b++) {
      for (let a = 0;a < pnx; a++) {
        latticePoint(c0x + a, c0y + b, c0z + c, cfg, p);
        const i = pIndex(a, b, c);
        px[i] = p.x;
        py[i] = p.y;
        pz[i] = p.z;
        values[i] = field(p.x, p.y, p.z);
      }
    }
  }
  const cellVert = new Int32Array(cnx * cny * cnz).fill(-1);
  const cIndex = (a, b, c) => (c * cny + b) * cnx + a;
  const positions = [];
  const normals = [];
  const EDGES = [
    [0, 0, 0, 1, 0, 0],
    [0, 1, 0, 1, 1, 0],
    [0, 0, 1, 1, 0, 1],
    [0, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 0],
    [1, 0, 0, 1, 1, 0],
    [0, 0, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 1],
    [0, 1, 0, 0, 1, 1],
    [1, 1, 0, 1, 1, 1]
  ];
  const eps = cfg.spacing * 0.05;
  for (let c = 0;c < cnz; c++) {
    for (let b = 0;b < cny; b++) {
      for (let a = 0;a < cnx; a++) {
        let neg = 0;
        for (let k = 0;k < 8; k++) {
          const i = pIndex(a + (k & 1), b + (k >> 1 & 1), c + (k >> 2 & 1));
          if (values[i] < 0)
            neg++;
        }
        if (neg === 0 || neg === 8)
          continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [ax, ay, az, bx, by, bz] of EDGES) {
          const i0 = pIndex(a + ax, b + ay, c + az);
          const i1 = pIndex(a + bx, b + by, c + bz);
          const v0 = values[i0];
          const v1 = values[i1];
          if (v0 < 0 === v1 < 0)
            continue;
          const t = v0 / (v0 - v1);
          sx += px[i0] + (px[i1] - px[i0]) * t;
          sy += py[i0] + (py[i1] - py[i0]) * t;
          sz += pz[i0] + (pz[i1] - pz[i0]) * t;
          n++;
        }
        if (n === 0)
          continue;
        const vx = sx / n;
        const vy = sy / n;
        const vz = sz / n;
        if (cfg.clip != null && !cfg.clip(vx, vy, vz))
          continue;
        cellVert[cIndex(a, b, c)] = positions.length / 3;
        positions.push(vx, vy, vz);
        let gx = field(vx + eps, vy, vz) - field(vx - eps, vy, vz);
        let gy = field(vx, vy + eps, vz) - field(vx, vy - eps, vz);
        let gz = field(vx, vy, vz + eps) - field(vx, vy, vz - eps);
        const len = Math.hypot(gx, gy, gz) || 1;
        gx /= len;
        gy /= len;
        gz /= len;
        normals.push(gx, gy, gz);
      }
    }
  }
  const indices = [];
  const ownsX = (a) => a >= 1 && a < chunk.nx + 1;
  const ownsY = (b) => b >= 1 && b < chunk.ny + 1;
  const ownsZ = (c) => c >= 1 && c < chunk.nz + 1;
  const quad = (q0, q1, q2, q3, flip) => {
    if (q0 < 0 || q1 < 0 || q2 < 0 || q3 < 0)
      return;
    if (flip)
      indices.push(q0, q2, q1, q0, q3, q2);
    else
      indices.push(q0, q1, q2, q0, q2, q3);
  };
  for (let c = 0;c < pnz; c++) {
    for (let b = 0;b < pny; b++) {
      for (let a = 0;a < pnx; a++) {
        const v = values[pIndex(a, b, c)];
        const solid = v < 0;
        if (a + 1 < pnx && b >= 1 && c >= 1 && ownsX(a) && ownsY(b) && ownsZ(c)) {
          const v1 = values[pIndex(a + 1, b, c)];
          if (solid !== v1 < 0) {
            quad(cellVert[cIndex(a, b - 1, c - 1)], cellVert[cIndex(a, b, c - 1)], cellVert[cIndex(a, b, c)], cellVert[cIndex(a, b - 1, c)], solid);
          }
        }
        if (b + 1 < pny && a >= 1 && c >= 1 && ownsX(a) && ownsY(b) && ownsZ(c)) {
          const v1 = values[pIndex(a, b + 1, c)];
          if (solid !== v1 < 0) {
            quad(cellVert[cIndex(a - 1, b, c - 1)], cellVert[cIndex(a - 1, b, c)], cellVert[cIndex(a, b, c)], cellVert[cIndex(a, b, c - 1)], solid);
          }
        }
        if (c + 1 < pnz && a >= 1 && b >= 1 && ownsX(a) && ownsY(b) && ownsZ(c)) {
          const v1 = values[pIndex(a, b, c + 1)];
          if (solid !== v1 < 0) {
            quad(cellVert[cIndex(a - 1, b - 1, c)], cellVert[cIndex(a, b - 1, c)], cellVert[cIndex(a, b, c)], cellVert[cIndex(a - 1, b, c)], solid);
          }
        }
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3
  };
}

// src/patch-field.ts
function terrainDensity(heightAt) {
  return (x, y, z) => y - heightAt(x, z);
}

// src/perlin-noise.ts
class PerlinNoise {
  perm;
  gradP;
  constructor(seed) {
    this.perm = new Uint8Array(512);
    this.gradP = new Float64Array(512 * 3);
    this.seed(seed || Math.random() * 65536);
  }
  seed(seed) {
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return Math.abs(seed) / 2147483647;
    };
    const p = new Uint8Array(256);
    for (let i = 0;i < 256; i++) {
      p[i] = i;
    }
    for (let i = 255;i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0;i < 512; i++) {
      this.perm[i] = p[i & 255];
      const [gx, gy, gz] = this.generateGradient(this.perm[i]);
      this.gradP[i * 3] = gx;
      this.gradP[i * 3 + 1] = gy;
      this.gradP[i * 3 + 2] = gz;
    }
  }
  noise3D(x, y, z) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const fz = Math.floor(z);
    const X = fx & 255;
    const Y = fy & 255;
    const Z = fz & 255;
    x -= fx;
    y -= fy;
    z -= fz;
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;
    return this.lerp(this.lerp(this.lerp(this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z), u), this.lerp(this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z), u), v), this.lerp(this.lerp(this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1), u), this.lerp(this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
  noise2D(x, y) {
    return this.noise3D(x, y, 0);
  }
  fractal(x, y, z, octaves = 6, persistence = 0.5, lacunarity = 2) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0;i < octaves; i++) {
      total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  lerp(a, b, t) {
    return (1 - t) * a + t * b;
  }
  grad(hash, x, y, z) {
    const g = this.gradP;
    const i = (hash & 511) * 3;
    return g[i] * x + g[i + 1] * y + g[i + 2] * z;
  }
  generateGradient(hash) {
    const h = hash & 15;
    const u = h < 8 ? 1 : -1;
    const v = h < 4 ? 1 : h === 12 || h === 14 ? 1 : -1;
    const w = h & 1 ? 1 : -1;
    switch (h & 7) {
      case 0:
        return [u, v, 0];
      case 1:
        return [-v, u, 0];
      case 2:
        return [0, u, v];
      case 3:
        return [0, -v, u];
      case 4:
        return [u, 0, v];
      case 5:
        return [-v, 0, u];
      case 6:
        return [v, 0, u];
      case 7:
        return [u, v, w];
      default:
        return [0, 0, 0];
    }
  }
}

// src/carve.ts
var exports_carve = {};
__export(exports_carve, {
  warp: () => warp,
  union: () => union,
  tube: () => tube,
  subtract: () => subtract,
  sphere: () => sphere,
  smoothUnion: () => smoothUnion,
  shaft: () => shaft,
  roughen: () => roughen,
  intersect: () => intersect,
  flange: () => flange,
  capsule: () => capsule,
  box: () => box,
  applyCarve: () => applyCarve
});
function applyCarve(carve) {
  return (x, y, z, d) => Math.max(d, carve(x, y, z));
}
function sphere(centre, radius) {
  return (x, y, z) => radius - Math.hypot(x - centre.x, y - centre.y, z - centre.z);
}
function capsule(a, b, radius, radiusB = radius) {
  const bax = b.x - a.x;
  const bay = b.y - a.y;
  const baz = b.z - a.z;
  const len2 = bax * bax + bay * bay + baz * baz || 0.000000001;
  return (x, y, z) => {
    const pax = x - a.x;
    const pay = y - a.y;
    const paz = z - a.z;
    let t = (pax * bax + pay * bay + paz * baz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = pax - bax * t;
    const dy = pay - bay * t;
    const dz = paz - baz * t;
    return radius + (radiusB - radius) * t - Math.hypot(dx, dy, dz);
  };
}
function tube(points, radii) {
  const segs = [];
  for (let i = 0;i + 1 < points.length; i++) {
    const ra = typeof radii === "number" ? radii : radii[i] ?? 1;
    const rb = typeof radii === "number" ? radii : radii[i + 1] ?? ra;
    segs.push(capsule(points[i], points[i + 1], ra, rb));
  }
  if (segs.length === 0)
    return () => -1e9;
  return union(...segs);
}
function box(centre, half, rounding = 0) {
  return (x, y, z) => {
    const qx = Math.abs(x - centre.x) - (half.x - rounding);
    const qy = Math.abs(y - centre.y) - (half.y - rounding);
    const qz = Math.abs(z - centre.z) - (half.z - rounding);
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const oz = Math.max(qz, 0);
    const outside = Math.hypot(ox, oy, oz);
    const inside = Math.min(Math.max(qx, Math.max(qy, qz)), 0);
    return rounding - (outside + inside);
  };
}
function union(...carves) {
  return (x, y, z) => {
    let m = -Infinity;
    for (const c of carves) {
      const v = c(x, y, z);
      if (v > m)
        m = v;
    }
    return m;
  };
}
function smoothUnion(k, ...carves) {
  if (k <= 0)
    return union(...carves);
  return (x, y, z) => {
    let acc = -Infinity;
    for (const c of carves) {
      const v = c(x, y, z);
      if (acc === -Infinity) {
        acc = v;
        continue;
      }
      const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (v - acc) / k));
      acc = v * h + acc * (1 - h) + k * h * (1 - h);
    }
    return acc;
  };
}
function subtract(a, b) {
  return (x, y, z) => Math.min(a(x, y, z), -b(x, y, z));
}
function intersect(a, b) {
  return (x, y, z) => Math.min(a(x, y, z), b(x, y, z));
}
function roughen(carve, opts) {
  const noise = new PerlinNoise(opts.seed ?? 1);
  const oct = opts.octaves ?? 3;
  const { amp, scale } = opts;
  return (x, y, z) => carve(x, y, z) + noise.fractal(x * scale, y * scale, z * scale, oct) * amp;
}
function warp(carve, opts) {
  const noise = new PerlinNoise(opts.seed ?? 2);
  const oct = opts.octaves ?? 2;
  const { amp, scale } = opts;
  return (x, y, z) => {
    const sx = x * scale;
    const sy = y * scale;
    const sz = z * scale;
    return carve(x + noise.fractal(sx, sy, sz, oct) * amp, y + noise.fractal(sx + 31.4, sy + 17.2, sz + 5.9, oct) * amp, z + noise.fractal(sx - 12.7, sy + 44.1, sz - 8.3, oct) * amp);
  };
}
function flange(carve, over = 30, extra = 18) {
  const span = Math.max(0.001, over);
  return (x, y, z, d) => {
    const base = carve(x, y, z, d);
    const t = 1 - Math.min(1, Math.max(0, -d) / span);
    return base + extra * t * t;
  };
}
function shaft(x0, z0, radius, depth, lean = { x: 0, y: 0, z: 0 }) {
  return (x, y, z, d) => {
    const t = Math.max(0, Math.min(1, -d / depth));
    const cx = x0 + lean.x * t;
    const cz = z0 + lean.z * t;
    const inRadius = radius - Math.hypot(x - cx, z - cz);
    const aboveFloor = d + depth;
    return Math.min(inRadius, aboveFloor);
  };
}

// ../../../private/tmp/vol-entry.ts
window.volMath = { extractChunk, terrainDensity, PerlinNoise, carve: exports_carve };
