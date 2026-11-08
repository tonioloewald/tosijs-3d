/*#
# hand socket

**Where a hand holds things, on any rig.** A hand bone's axes are the rig
maker's choice, so a grip dialled in against one rig's bone holds the item at
a wrong angle on another. A hand's SOCKET is a frame under the hand set by its
ANATOMY instead (the forearm's direction, the thumb's side), calibrated so
that on UAL's mannequin it is the hand bone itself. A grip (see
[[hold-grip]]) is a point and a turn in that frame, so one set of numbers
holds an item the same way in every hand.

This is the arithmetic, with no engine. `handSocket` in
[[b3d-launcher|the launcher]] runs it on a Babylon skeleton (the character
builder's Hold), and `riggedBodyGlb`'s `held` option on an exported body, so
the socket in a file is where the builder shows it.

```javascript
import { socketWorld, gripMatrix, gripPoint, mat4Multiply } from 'tosijs-3d/hand-socket'

// Joint positions in the scene's frame (Babylon's, left-handed).
const socket = socketWorld('r', hand, lowerarm, thumb)
const grip = mat4Multiply(gripMatrix({ x, y, z, rx, ry, rz }), socket)
gripPoint(itemPositions) // the middle of the item's lowest third
```

Matrices are Babylon's layout: 16 numbers, row-major, for ROW vectors
(`p' = p·M`, so `a·b` is a then b). A grip's turn is Babylon's
`Quaternion.FromEulerAngles(rx, ry, rz)` in degrees (yaw about y, then pitch
about x, then roll about z).

Pure: no DOM, no Babylon.
*/
/*{ "parent": "hold-grip" }*/

export type Vec3 = { x: number; y: number; z: number }
/** 16 numbers, row-major, row vectors (Babylon's `Matrix.m`). */
export type Mat4 = number[]
/** [x, y, z, w] */
export type Quat = [number, number, number, number]

/*
UAL's right hand in its anatomy frame (`socketCalibration`, measured on
UAL1_core in Babylon, under the glTF loader's mirror). The left hand is its
mirror image.
*/
export const HAND_IN_ANATOMY: Record<'r' | 'l', Mat4> = {
  r: [
    0, -0.56698, -0.82373, 0, 0.99985, -0.0142, 0.00977, 0, 0.01724, 0.82361,
    -0.5669, 0, 0, 0, 0, 1,
  ],
  l: [
    0, 0.56698, -0.82373, 0, 0.99985, -0.0142, -0.00977, 0, 0.01724, 0.82361,
    0.5669, 0, 0, 0, 0, 1,
  ],
}

export const IDENTITY4: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** `a·b`: a, then b. */
export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16)
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j]
      out[i * 4 + j] = s
    }
  return out
}

/** The inverse (a zero matrix when there is none). */
export function mat4Invert(m: Mat4): Mat4 {
  const [a00, a01, a02, a03, a10, a11, a12, a13] = m.slice(0, 8)
  const [a20, a21, a22, a23, a30, a31, a32, a33] = m.slice(8, 16)
  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32
  const det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (det === 0) return new Array(16).fill(0)
  const d = 1 / det
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * d,
    (a02 * b10 - a01 * b11 - a03 * b09) * d,
    (a31 * b05 - a32 * b04 + a33 * b03) * d,
    (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d,
    (a00 * b11 - a02 * b08 + a03 * b07) * d,
    (a32 * b02 - a30 * b05 - a33 * b01) * d,
    (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d,
    (a01 * b08 - a00 * b10 - a03 * b06) * d,
    (a30 * b04 - a31 * b02 + a33 * b00) * d,
    (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d,
    (a00 * b09 - a01 * b07 + a02 * b06) * d,
    (a31 * b01 - a30 * b03 - a32 * b00) * d,
    (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ]
}

/** A point through `m`. */
export function mat4Point(m: Mat4, p: Vec3): Vec3 {
  return {
    x: p.x * m[0] + p.y * m[4] + p.z * m[8] + m[12],
    y: p.x * m[1] + p.y * m[5] + p.z * m[9] + m[13],
    z: p.x * m[2] + p.y * m[6] + p.z * m[10] + m[14],
  }
}

/** Scale, then turn, then move: a Babylon node's local matrix. */
export function compose(scale: Vec3, q: Quat, t: Vec3): Mat4 {
  const [x, y, z, w] = q
  const x2 = x + x
  const y2 = y + y
  const z2 = z + z
  const xx = x * x2
  const xy = x * y2
  const xz = x * z2
  const yy = y * y2
  const yz = y * z2
  const zz = z * z2
  const wx = w * x2
  const wy = w * y2
  const wz = w * z2
  return [
    (1 - (yy + zz)) * scale.x,
    (xy + wz) * scale.x,
    (xz - wy) * scale.x,
    0,
    (xy - wz) * scale.y,
    (1 - (xx + zz)) * scale.y,
    (yz + wx) * scale.y,
    0,
    (xz + wy) * scale.z,
    (yz - wx) * scale.z,
    (1 - (xx + yy)) * scale.z,
    0,
    t.x,
    t.y,
    t.z,
    1,
  ]
}

/** Babylon's `Quaternion.FromEulerAngles`, in degrees. */
export function eulerQuaternion(rx: number, ry: number, rz: number): Quat {
  const d = Math.PI / 360
  const sr = Math.sin(rz * d)
  const cr = Math.cos(rz * d)
  const sp = Math.sin(rx * d)
  const cp = Math.cos(rx * d)
  const sy = Math.sin(ry * d)
  const cy = Math.cos(ry * d)
  return [
    cy * sp * cr + sy * cp * sr,
    sy * cp * cr - cy * sp * sr,
    cy * cp * sr - sy * sp * cr,
    cy * cp * cr + sy * sp * sr,
  ]
}

/** `v` turned by `q`. */
export function quatRotate(q: Quat, v: Vec3): Vec3 {
  return mat4Point(compose({ x: 1, y: 1, z: 1 }, q, { x: 0, y: 0, z: 0 }), v)
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
})
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / l, y: v.y / l, z: v.z / l }
}

/**
 * A hand's anatomy frame in the world: x along the forearm (elbow to hand),
 * y towards the thumb's side, at the hand. Null when the thumb is in line
 * with the forearm.
 */
export function anatomyFrame(
  hand: Vec3,
  lowerarm: Vec3,
  thumb: Vec3
): Mat4 | null {
  const x = unit(sub(hand, lowerarm))
  const zRaw = cross(x, sub(thumb, hand))
  if (!(Math.hypot(zRaw.x, zRaw.y, zRaw.z) > 1e-9)) return null
  const z = unit(zRaw)
  const y = unit(cross(z, x))
  return [x.x, x.y, x.z, 0, y.x, y.y, y.z, 0, z.x, z.y, z.z, 0, hand.x, hand.y, hand.z, 1]
}

/**
 * The socket in the world, from the hand's, its forearm's and its thumb's
 * joints (in the scene's frame). Null when the hand cannot be read.
 */
export function socketWorld(
  side: 'r' | 'l',
  hand: Vec3,
  lowerarm: Vec3,
  thumb: Vec3
): Mat4 | null {
  const anatomy = anatomyFrame(hand, lowerarm, thumb)
  return anatomy && mat4Multiply(HAND_IN_ANATOMY[side], anatomy)
}

/** The socket as a child of the hand, whose world matrix is `handWorld`. */
export function socketInHand(
  side: 'r' | 'l',
  handWorld: Mat4,
  lowerarm: Vec3,
  thumb: Vec3
): Mat4 | null {
  const hand = { x: handWorld[12], y: handWorld[13], z: handWorld[14] }
  const world = socketWorld(side, hand, lowerarm, thumb)
  return world && mat4Multiply(world, mat4Invert(handWorld))
}

export interface Grip {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  scale?: number
}

/** A grip's point and turn in the socket's frame (no scale). */
export function gripMatrix(g: Grip): Mat4 {
  return compose(
    { x: 1, y: 1, z: 1 },
    eulerQuaternion(g.rx, g.ry, g.rz),
    { x: g.x, y: g.y, z: g.z }
  )
}

/**
 * An item's place in the socket's frame: scaled by the grip's `scale` and
 * turned, with its grip point (`grip`, in its own frame) at the grip.
 */
export function heldMatrix(g: Grip, grip: Vec3): Mat4 {
  const s = g.scale ?? 1
  const q = eulerQuaternion(g.rx, g.ry, g.rz)
  const spun = quatRotate(q, { x: grip.x * s, y: grip.y * s, z: grip.z * s })
  return compose({ x: s, y: s, z: s }, q, {
    x: g.x - spun.x,
    y: g.y - spun.y,
    z: g.z - spun.z,
  })
}

/**
 * Where an item is held, in its own frame: the middle of its lowest third
 * (a pistol's handle hangs below its slide). Null for an empty or flat item.
 */
export function gripPoint(positions: ArrayLike<number>): Vec3 | null {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 1; i < positions.length; i += 3) {
    lo = Math.min(lo, positions[i])
    hi = Math.max(hi, positions[i])
  }
  if (!(hi > lo)) return null
  const cut = lo + (hi - lo) / 3
  let n = 0
  const acc = { x: 0, y: 0, z: 0 }
  for (let i = 0; i < positions.length; i += 3) {
    if (positions[i + 1] > cut) continue
    acc.x += positions[i]
    acc.y += positions[i + 1]
    acc.z += positions[i + 2]
    n++
  }
  return n > 0 ? { x: acc.x / n, y: acc.y / n, z: acc.z / n } : null
}
