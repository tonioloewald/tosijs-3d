export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface SurfaceSampler {
  sample(u: number, v: number): Vec3
  normal(u: number, v: number): Vec3
}

const TWO_PI = Math.PI * 2

export class TorusSampler implements SurfaceSampler {
  constructor(
    public majorRadius: number = 100,
    public minorRadius: number = 40
  ) {}

  sample(u: number, v: number): Vec3 {
    const theta = u * TWO_PI
    const phi = v * TWO_PI
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    const cosPhi = Math.cos(phi)
    const sinPhi = Math.sin(phi)
    return {
      x: (this.majorRadius + this.minorRadius * cosPhi) * cosTheta,
      y: this.minorRadius * sinPhi,
      z: (this.majorRadius + this.minorRadius * cosPhi) * sinTheta,
    }
  }

  normal(u: number, v: number): Vec3 {
    const theta = u * TWO_PI
    const phi = v * TWO_PI
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    const cosPhi = Math.cos(phi)
    const sinPhi = Math.sin(phi)
    return {
      x: cosPhi * cosTheta,
      y: sinPhi,
      z: cosPhi * sinTheta,
    }
  }
}

/**
 * Cylinder sampler: u wraps seamlessly around the circumference,
 * v reflects at 0.5 to create a finite mirrored world (like a planet
 * with symmetric hemispheres). No singularities anywhere.
 *
 * For planet rendering, smooth noise to 0 near v=0 and v=0.5
 * to hide the mirror seam at poles.
 */
export class CylinderSampler implements SurfaceSampler {
  constructor(public radius: number = 100, public height: number = 200) {}

  sample(u: number, v: number): Vec3 {
    // Reflect v into [0, 0.5] — creates symmetric hemispheres
    let vr = ((v % 1) + 1) % 1 // wrap to [0, 1)
    if (vr > 0.5) vr = 1 - vr

    const theta = u * TWO_PI
    return {
      x: this.radius * Math.cos(theta),
      y: vr * this.height,
      z: this.radius * Math.sin(theta),
    }
  }

  normal(u: number, v: number): Vec3 {
    const theta = u * TWO_PI
    return {
      x: Math.cos(theta),
      y: 0,
      z: Math.sin(theta),
    }
  }

  /** Circumference in u direction */
  get circumferenceU(): number {
    return TWO_PI * this.radius
  }

  /** Full height in v direction (only half is unique due to reflection) */
  get circumferenceV(): number {
    return this.height
  }
}

export class SphereSampler implements SurfaceSampler {
  constructor(public radius: number = 100) {}

  sample(u: number, v: number): Vec3 {
    const theta = u * TWO_PI
    const phi = v * Math.PI
    const sinPhi = Math.sin(phi)
    return {
      x: this.radius * sinPhi * Math.cos(theta),
      y: this.radius * Math.cos(phi),
      z: this.radius * sinPhi * Math.sin(theta),
    }
  }

  normal(u: number, v: number): Vec3 {
    const theta = u * TWO_PI
    const phi = v * Math.PI
    const sinPhi = Math.sin(phi)
    return {
      x: sinPhi * Math.cos(theta),
      y: Math.cos(phi),
      z: sinPhi * Math.sin(theta),
    }
  }
}
