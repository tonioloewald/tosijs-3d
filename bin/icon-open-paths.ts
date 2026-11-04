/*
In a `stroked/filled` icon a fill means KNOCKOUT (the near arm hides the body)
and no fill means an OPEN path (an arrow, an arc), which both renderers honour
as the path's own `fill="none"`. tosijs-ui's generator strips every fill there,
`none` included, so an open path came out filled. This puts `fill="none"` back
on the paths the artwork drew without one. Runs after `tosijs-make-icons`.
*/
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const OUT = 'src/icon-data.ts'

function svgFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? svgFiles(p) : p.endsWith('.svg') ? [p] : []
  })
}

let data = readFileSync(OUT, 'utf8')
let fixed = 0
for (const file of svgFiles('icons')) {
  if (!/stroked/.test(file) || !/filled/.test(file)) continue
  const open = [...readFileSync(file, 'utf8').matchAll(/<path\b[^>]*>/g)].map((m) =>
    /fill\s*:\s*none|fill="none"/.test(m[0])
  )
  if (!open.some(Boolean)) continue
  const name = basename(file, '.svg').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
  const entry = new RegExp(`(\\n  ${name}:\\s*\\n?\\s*')([^']*)'`)
  data = data.replace(entry, (_, head, svg) => {
    let i = 0
    const out = svg.replace(/<path\b/g, (tag: string) => (open[i++] ? (fixed++, '<path fill="none"') : tag))
    return `${head}${out}'`
  })
}
writeFileSync(OUT, data)
console.log(`icon-open-paths: ${fixed} open path(s) kept open`)
