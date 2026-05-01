/**
 * A clean implementation of 3D Perlin Noise
 * Inspired by Ken Perlin's improved noise algorithm
 */
export class PerlinNoise {
    perm;
    gradP;
    /**
     * Creates a new Perlin noise generator
     * @param seed Optional seed for the random number generator
     */
    constructor(seed) {
        // Initialize permutation table
        this.perm = new Uint8Array(512);
        this.gradP = new Array(512);
        this.seed(seed || Math.random() * 65536);
    }
    /**
     * Seeds the noise generator
     * @param seed Numeric seed value
     */
    seed(seed) {
        // Create a simple random number generator based on the seed
        const random = () => {
            // Simple xorshift algorithm
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            return Math.abs(seed) / 2147483647;
        };
        // Create shuffled permutation table
        const p = new Uint8Array(256);
        // Fill with values 0...255
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }
        // Fisher-Yates shuffle with our seeded random
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]]; // Swap values
        }
        // Duplicate to avoid buffer overruns
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.gradP[i] = this.generateGradient(this.perm[i]);
        }
    }
    /**
     * Samples 3D Perlin noise at the given coordinates
     * @param x X coordinate
     * @param y Y coordinate
     * @param z Z coordinate
     * @returns Value between -1 and 1
     */
    noise3D(x, y, z) {
        // Find unit cube that contains point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        // Find relative position in cube
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        // Compute fade curves
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        // Hash coordinates of the 8 cube corners
        const A = this.perm[X] + Y;
        const AA = this.perm[A] + Z;
        const AB = this.perm[A + 1] + Z;
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B] + Z;
        const BB = this.perm[B + 1] + Z;
        // Calculate noise contributions from each corner
        return this.lerp(this.lerp(this.lerp(this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z), u), this.lerp(this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z), u), v), this.lerp(this.lerp(this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1), u), this.lerp(this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    }
    /**
     * Samples 2D Perlin noise at the given coordinates
     * @param x X coordinate
     * @param y Y coordinate
     * @returns Value between -1 and 1
     */
    noise2D(x, y) {
        // For convenience, we can use the 3D function and set z to 0
        return this.noise3D(x, y, 0);
    }
    /**
     * Generates multiple octaves of noise at the given coordinates
     * @param x X coordinate
     * @param y Y coordinate
     * @param z Z coordinate
     * @param octaves Number of octaves to generate
     * @param persistence How much each octave contributes to the overall shape (amplitude multiplier)
     * @param lacunarity Frequency multiplier for successive octaves
     * @returns Value typically between -1 and 1 (but can exceed these bounds with high octave count)
     */
    fractal(x, y, z, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0; // Used for normalizing result
        for (let i = 0; i < octaves; i++) {
            total +=
                this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        // Normalize the result
        return total / maxValue;
    }
    /**
     * Internal helper: Fade function as defined by Ken Perlin
     * 6t^5 - 15t^4 + 10t^3 is the smoothstep function that provides smooth interpolation
     */
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    /**
     * Internal helper: Linear interpolation
     */
    lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }
    /**
     * Internal helper: Compute gradient direction
     * This is the core of Perlin noise - calculate dot product between
     * gradient vectors and distance vectors
     */
    grad(hash, x, y, z) {
        // Get gradient vector for this corner
        const [gx, gy, gz] = this.gradP[hash & 511];
        // Compute dot product with distance vector
        return gx * x + gy * y + gz * z;
    }
    /**
     * Internal helper: Generate a random gradient vector
     */
    generateGradient(hash) {
        // Convert low 4 bits of hash to 0-15
        const h = hash & 15;
        // Create gradients that are uniformly distributed on a sphere
        // This is crucial for proper 3D noise
        const u = h < 8 ? 1 : -1;
        const v = h < 4 ? 1 : h === 12 || h === 14 ? 1 : -1;
        const w = h & 1 ? 1 : -1;
        // Use different gradient combinations based on hash value
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
                return [0, 0, 0]; // Should never happen
        }
    }
}
//# sourceMappingURL=perlin-noise.js.map