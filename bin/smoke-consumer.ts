#!/usr/bin/env bun
/*
Consume tosijs-3d the way an adopter does, from the TARBALL, and check what only
that reveals. Run by the publish workflow (practices/publishing-via-oidc.md) on
the tarball about to be staged and again on the registry's copy; `bun run
test-consumer` runs it on a fresh pack of this tree.

WHY OUR OWN rather than the practices' generic smoke: the generic one compiles
with `skipLibCheck` off and nothing else, and Babylon's own .d.ts files name
WebGPU types (`GPUBuffer`, `GPUDevice`, …) that exist only with
`@webgpu/types`. So every Babylon-based package failed it on its PEER's
declarations, never reaching ours (first dry run, 2026-09-26). A real Babylon
consumer has `@webgpu/types` (Babylon's docs say so) or skips lib checks; this
does the former, so OUR .d.ts are still checked strictly.

What it adds that the generic one does not:
  - the PURE subpaths import under plain Node with no DOM — the check that
    found tosijs-3d#69 (394 extensionless specifiers) and the reason those
    subpaths exist (headless validation of documents)
  - the superseded modules stay unreachable
  - no stray files, and a size ceiling that notices the next accidental ship

CONTRACT with publish-smoke: print the tarball's path, and test THAT file.
*/

import { $ } from 'bun'
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

const failures: string[] = []
const passes: string[] = []
function check(name: string, ok: boolean, detail = '') {
  if (ok) passes.push(`  ✅ ${name}`)
  else failures.push(`  ❌ ${name}${detail ? `\n       ${detail}` : ''}`)
}

const repo = process.cwd()
const pkg = await Bun.file(`${repo}/package.json`).json()
const work = mkdtempSync(path.join(tmpdir(), 'tosijs-3d-consumer-'))

// Modules documented as importable with no DOM (see src/no-dom.test.ts, which
// pins the same property from source; this pins it from the PUBLISHED files).
const PURE = [
  'scene-schemas',
  'light-settings',
  'color',
  'world-store',
  'world-topology',
  'wind',
  'voxel-galaxy',
  'mersenne-twister',
  'perlin-noise',
  'fly-by-wire',
]

try {
  let tarball: string
  const given = process.env.SMOKE_TARBALL
  if (given) {
    tarball = path.join(work, path.basename(given))
    copyFileSync(path.resolve(repo, given), tarball)
  } else {
    const out = await $`npm pack --pack-destination ${work}`.cwd(repo).quiet()
    tarball = path.join(work, out.stdout.toString().trim().split('\n').pop()!)
  }
  console.log(`📦 testing ${tarball}`)

  // ── the artifact ─────────────────────────────────────────────────────────
  const listing = (await $`tar -tzf ${tarball}`.quiet().text())
    .split('\n')
    .filter(Boolean)
  const strays = listing.filter((f) =>
    /(^|\/)(\.DS_Store|\.metadata_never_index|\.env(\..*)?|npm-debug\.log.*|tsconfig\.tsbuildinfo)$/.test(
      f
    )
  )
  check('no local cruft in the tarball', strays.length === 0, strays.join(', '))
  check(
    'no src/ in the tarball (dist is the product)',
    !listing.some((f) => f.startsWith('package/src/'))
  )
  // ~2.1 MB packed at 0.8.4 (791 files). The ceiling is there to notice the
  // next site bundle or asset that slips into `files`, not to police growth.
  const bytes = Bun.file(tarball).size
  check(
    `tarball under 4 MB (is ${(bytes / 1e6).toFixed(2)} MB, ${
      listing.length
    } files)`,
    bytes < 4_000_000
  )

  // ── a consumer project ───────────────────────────────────────────────────
  const proj = path.join(work, 'consumer')
  await $`mkdir -p ${proj}`.quiet()
  await Bun.write(
    `${proj}/package.json`,
    JSON.stringify({ name: 'consumer-smoke', private: true, type: 'module' })
  )
  // npm, not bun: npm REFUSES a peer range bun would quietly resolve.
  const peers = Object.entries(pkg.peerDependencies ?? {})
    .filter(([n]) => !pkg.peerDependenciesMeta?.[n]?.optional)
    .map(([n, r]) => `${n}@${r}`)
  const inst =
    await $`npm install --no-audit --no-fund ${tarball} ${peers} @webgpu/types typescript@5`
      .cwd(proj)
      .nothrow()
      .quiet()
  check(
    'npm installs the tarball with its peers',
    inst.exitCode === 0,
    inst.stderr.toString().trim().split('\n').slice(-6).join('\n       ')
  )

  if (inst.exitCode === 0) {
    // Superseded modules must not resolve (the wildcard export would otherwise
    // make them public API).
    for (const dead of ['reflections', 'dynamic-shadows', 'rippling-water']) {
      const r =
        await $`node -e ${`import('tosijs-3d/${dead}').then(()=>process.exit(1),e=>process.exit(e.code==='ERR_PACKAGE_PATH_NOT_EXPORTED'?0:2))`}`
          .cwd(proj)
          .nothrow()
          .quiet()
      check(`tosijs-3d/${dead} is blocked`, r.exitCode === 0)
    }

    // Pure subpaths EVALUATE under plain Node: resolution AND evaluation.
    for (const name of PURE) {
      const r =
        await $`node --input-type=module -e ${`await import('tosijs-3d/${name}')`}`
          .cwd(proj)
          .nothrow()
          .quiet()
      check(
        `node imports tosijs-3d/${name} with no DOM`,
        r.exitCode === 0,
        r.stderr.toString().trim().split('\n').slice(0, 3).join('\n       ')
      )
    }

    // Types: every entry, strictly, skipLibCheck OFF — with @webgpu/types in
    // scope, as a Babylon consumer has, so failures are OURS.
    const specs = [
      'tosijs-3d',
      'tosijs-3d/demo-utils',
      ...PURE.map((n) => `tosijs-3d/${n}`),
    ]
    await Bun.write(
      `${proj}/smoke.ts`,
      specs
        .map(
          (s, i) =>
            `import type * as m${i} from '${s}'\nexport type T${i} = typeof m${i}\n`
        )
        .join('')
    )
    const tsc =
      await $`npx tsc --noEmit --strict --skipLibCheck false --module esnext --moduleResolution bundler --target es2022 --lib es2022,dom,dom.iterable --types @webgpu/types smoke.ts`
        .cwd(proj)
        .nothrow()
        .quiet()
    const errors = tsc.stdout.toString().trim().split('\n').filter(Boolean)
    const ours = errors.filter((l) => l.includes('node_modules/tosijs-3d/'))
    check(
      `our .d.ts compile for a strict consumer (skipLibCheck off; ${specs.length} entries)`,
      tsc.exitCode === 0,
      (ours.length ? ours : errors).slice(0, 12).join('\n       ')
    )
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

console.log(passes.join('\n'))
if (failures.length) {
  console.log(failures.join('\n'))
  console.log(`\n❌ ${failures.length} consumer check(s) failed`)
  process.exit(1)
}
console.log(`\n✅ ${passes.length} consumer checks passed`)
