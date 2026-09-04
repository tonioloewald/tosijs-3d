import { describe, test, expect } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/*
NODE REQUIRES THE EXTENSION. NOTHING WE RUN DOES.

`dist` is emitted per-file (deliberately — consumers and agents get browseable
source plus types), so a relative specifier written `from './tosi-b3d'` survives
verbatim into the published JS. Bundlers resolve that; Node's ESM resolver does
not, and fails with ERR_MODULE_NOT_FOUND on import.

Every loop in this ecosystem is a bundler or Bun — the dev server, the doc site,
these tests, the games — so the one consumer that would notice is the one nobody
runs. tosijs-3d-ensemble found it by installing our tarball into an empty
directory and importing it under plain Node (#69), after shipping the identical
fault three times themselves.

Hence a test of the SOURCE: it fails at authoring time rather than after a
publish, which is the only point at which anyone was going to look.
*/

const SKIP_EXT = /\.(js|json|css|mjs|cjs|svg|glb|png|txt|md)$/

/**
 * Byte ranges of EVERY block comment.
 *
 * Not just the `/*#` doc comments: ordinary prose mentioning a specifier (this
 * file's own header does) would otherwise be reported as an offender, and a
 * guard that cries wolf gets deleted.
 */
function docRanges(src: string): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const re = /\/\*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) != null) {
    const end = src.indexOf('*/', m.index + 2)
    if (end > 0) out.push([m.index, end])
  }
  return out
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    // Tests are not published, so their specifiers never reach a Node consumer
    // — and this file deliberately contains a bad one as a fixture.
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p)
  }
  return out
}

describe('relative imports carry a .js extension', () => {
  test('no extensionless relative specifier in src/', () => {
    const offenders: string[] = []
    for (const file of walk('src')) {
      const src = readFileSync(file, 'utf8')
      const ranges = docRanges(src)
      const re = /\bfrom\s+['"](\.\.?\/[^'"]*)['"]/g
      let m: RegExpExecArray | null
      while ((m = re.exec(src)) != null) {
        if (ranges.some(([a, b]) => m!.index >= a && m!.index <= b)) continue
        if (SKIP_EXT.test(m[1])) continue
        const line = src.slice(0, m.index).split('\n').length
        offenders.push(`${file}:${line} → '${m[1]}'`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('no extensionless relative specifier in a dynamic import', () => {
    const offenders: string[] = []
    for (const file of walk('src')) {
      const src = readFileSync(file, 'utf8')
      const ranges = docRanges(src)
      const re = /\bimport\(\s*['"](\.\.?\/[^'"]*)['"]/g
      let m: RegExpExecArray | null
      while ((m = re.exec(src)) != null) {
        if (ranges.some(([a, b]) => m!.index >= a && m!.index <= b)) continue
        if (SKIP_EXT.test(m[1])) continue
        const line = src.slice(0, m.index).split('\n').length
        offenders.push(`${file}:${line} → '${m[1]}'`)
      }
    }
    expect(offenders).toEqual([])
  })

  test('the check would actually catch one', () => {
    // Guards the guard: a regex that matched nothing would pass this suite
    // silently, which is exactly the failure mode being defended against.
    const sample = `import { a } from './thing'\nimport { b } from './thing.js'\n`
    const found = [...sample.matchAll(/\bfrom\s+['"](\.\.?\/[^'"]*)['"]/g)]
      .map((m) => m[1])
      .filter((s) => !SKIP_EXT.test(s))
    expect(found).toEqual(['./thing'])
  })
})
