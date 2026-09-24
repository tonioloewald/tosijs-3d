/**
 * What tosijs-3d costs a consumer, against the committed baseline.
 *
 *   bun run sizes            print the sizes and the delta from dist-sizes.json
 *   bun run sizes --record   write them as the new baseline (do this at release)
 *
 * Two numbers, because the per-file dist is 180-odd files and a row each is
 * noise nobody reads:
 *
 * - **barrel** — `src/index.ts` bundled the way a consumer's bundler would
 *   (minified, every package external — Babylon, tosijs and fflate are theirs
 *   to ship or not). This is the number that answers "did this release make
 *   apps bigger". The 0.8.3 gate had to measure it by hand (m4).
 * - **dist** — every shipped `dist/*.js`, summed. What lands in node_modules.
 *
 * One-shot on purpose: Bun.build leaks natively in long-lived processes, so
 * this never belongs inside the dev server.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { gzipSync } from 'zlib'

interface Size {
  raw: number
  gz: number
}

const root = path.resolve(import.meta.dir, '..')
const baselineFile = path.join(root, 'dist-sizes.json')

async function barrel(): Promise<Size> {
  const result = await Bun.build({
    entrypoints: [path.join(root, 'src/index.ts')],
    minify: true,
    packages: 'external',
    target: 'browser',
  })
  if (!result.success) {
    for (const log of result.logs) console.error(log)
    throw new Error('barrel bundle failed')
  }
  const js = Buffer.from(await result.outputs[0].arrayBuffer())
  return { raw: js.length, gz: gzipSync(js, { level: 9 }).length }
}

function dist(): Size {
  const dir = path.join(root, 'dist')
  if (!existsSync(dir)) throw new Error('no dist/ — run `bun run build` first')
  let raw = 0
  let gz = 0
  for (const f of readdirSync(dir, { recursive: true }).map(String)) {
    if (!f.endsWith('.js')) continue
    const buf = readFileSync(path.join(dir, f))
    raw += buf.length
    gz += gzipSync(buf, { level: 9 }).length
  }
  return { raw, gz }
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`
const delta = (now: number, was?: number) => {
  if (was == null) return '(no baseline)'
  const d = now - was
  const pct = was > 0 ? ((d / was) * 100).toFixed(2) : '∞'
  return `${d >= 0 ? '+' : ''}${d} B (${d >= 0 ? '+' : ''}${pct}%)`
}

const sizes: Record<string, Size> = {
  'barrel (min, packages external)': await barrel(),
  'dist/*.js total': dist(),
}

let baseline: Record<string, Size> = {}
try {
  baseline = JSON.parse(readFileSync(baselineFile, 'utf8'))
} catch {
  /* no baseline yet */
}

for (const [name, s] of Object.entries(sizes)) {
  const b = baseline[name]
  console.log(
    `${name}: ${kb(s.raw)} raw ${delta(s.raw, b?.raw)} · ${kb(s.gz)} gz ${delta(
      s.gz,
      b?.gz
    )}`
  )
}

if (process.argv.includes('--record')) {
  writeFileSync(baselineFile, JSON.stringify(sizes, null, 2) + '\n')
  console.log(`recorded → ${path.relative(root, baselineFile)}`)
}
