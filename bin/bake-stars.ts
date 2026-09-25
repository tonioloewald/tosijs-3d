/**
 * Bake the POINT half of the shipped sky (`static/sky/stars_*`) from the voxel
 * galaxy — no browser, about a second. The smooth half (`nebula_*`) is not
 * touched: nothing here changes what it contains.
 *
 *   bun bin/bake-stars.ts                         the defaults below
 *   bun bin/bake-stars.ts --bright 20000 --dim 200000 --reach 0.04
 *   bun bin/bake-stars.ts --dry                    measure, write nothing
 *
 * Flags: --seed --bright --dim --reach --floor --nz --halfz --size --out --dry
 *
 * --nz / --halfz set the grid's vertical resolution: cells thicker than the
 * disc smear it into slabs. The default 60 over ±0.3 is 0.01 per cell,
 * thinner than the disc (it was 20, and the band came out in slabs).
 *
 * Exists for the tuning loop (GALAXY-DESIGN.md step 2): run it, reload a demo
 * that loads /sky/stars (Land and Sky, the cloud deck), look, adjust. When a
 * setting is right it belongs in SHIPPED_SKY.
 *
 * ⚠️ SHIPPING a rebake also means a new PINNED copy: `static/sky/<version>/`
 * with the twelve faces and a `manifest.json` (copy the previous one, update
 * the recipe). `/sky/stars` is "latest"; documents pin a version, and one that
 * is rewritten in place is no pin at all (tosijs-3d#90). `shipped-sky.test.ts`
 * fails until latest matches the newest version folder.
 */
import path from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { voxelGalaxy } from '../src/voxel-galaxy.js'
import {
  starsFromVoxelGalaxy,
  defaultBakePose,
  SHIPPED_SKY,
} from '../src/skybox-baker.js'
import { encodeStarfield, FACE_NAMES } from '../src/starfield-codec.js'
import { pngEncode } from '../src/png.js'

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}
const text = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const seed = arg('seed', SHIPPED_SKY.seed)
const brightBudget = arg('bright', SHIPPED_SKY.voxel.brightBudget)
const dimBudget = arg('dim', SHIPPED_SKY.voxel.dimBudget)
const dimReach = arg('reach', SHIPPED_SKY.voxel.dimReach)
const floor = arg('floor', SHIPPED_SKY.voxel.floor)
const size = arg('size', SHIPPED_SKY.dataSize)
const nz = arg('nz', 60)
const halfZ = arg('halfz', 0.3)
const out = path.resolve(import.meta.dir, '..', text('out', 'static/sky'))
const dry = process.argv.includes('--dry')

const t0 = performance.now()
const galaxy = voxelGalaxy({ seed, brightBudget, dimBudget, nz, halfZ })
// The distant shell is the galaxy's own, on its own derived seed — it used to
// be the tail of the old generator's stream, which meant generating 100k old
// stars just to reach it (GALAXY-DESIGN.md → "Reconciliation").
const shell = galaxy.shell()
const eye = defaultBakePose(
  SHIPPED_SKY.radius,
  SHIPPED_SKY.outFraction,
  SHIPPED_SKY.offPlane
)
const sky = starsFromVoxelGalaxy(galaxy, shell, eye, {
  radius: SHIPPED_SKY.radius,
  dimReach,
  floor,
})
const enc = encodeStarfield(sky.objects, size)
const ms = performance.now() - t0

console.log(
  `seed ${seed} · nz ${nz} ±${halfZ} · bright ${sky.bright} (budget ${brightBudget}) · dim ${sky.dim} ` +
    `within ${sky.dimRadius.toFixed(
      3
    )} (reach ${dimReach}, floor ${floor}, budget ${dimBudget}) · ` +
    `${sky.objects.length} objects → placed ${enc.placed}, lost ${
      enc.collided
    } · ${ms.toFixed(0)} ms`
)

if (!dry) {
  mkdirSync(out, { recursive: true })
  for (let i = 0; i < enc.faces.length; i++) {
    writeFileSync(
      path.join(out, `stars_${FACE_NAMES[i]}.png`),
      pngEncode(enc.faces[i], size, size)
    )
  }
  console.log(`wrote ${path.relative(process.cwd(), out)}/stars_*.png`)
}
