// Build entry — thin wrapper over tosijs-ui/site's reusable doc-site pipeline.
// Everything declarative lives in ../site.config.ts; this file just dispatches
// build-only vs dev-server.
//
//   bun bin/site.ts            # build the doc site, then start the dev server
//   bun bin/site.ts --build    # build the doc site (incl. library tsc) and exit (0/1)

import { watch } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { buildSite, devServer } from 'tosijs-ui/site'
import config from '../site.config'

const buildOnly = process.argv.includes('--build')

const ok = await buildSite(config)
if (!ok) process.exit(1)
if (buildOnly) process.exit(0)

/*
WATCH `static/` AND COPY CHANGED FILES STRAIGHT INTO `docs/`.

The dev server rebuilds on SOURCE changes, and `buildSite` copies `staticDirs`
into `docs/` as part of that — but nothing watches `static/` itself. So
replacing an asset (a re-exported GLB, say) left the page serving the previous
one indefinitely, with no error and no hint: `static/test-3.glb` and
`docs/test-3.glb` simply had different sizes.

The workaround was to `touch` a source file to force a rebuild, and that is
worse than it sounds — a full rebuild WIPES and repopulates `docs/` and
`dist/`, so doing it repeatedly is exactly the race CLAUDE.md warns about for
standalone builds. Used that way it eventually left the dev server alive with
no listener on 8030: the process was still there, the port was not.

Copying the single changed file is both the smaller hammer and the safer one —
no wipe, so there is no window in which `docs/` is empty.

Belongs upstream in `tosijs-ui/site`'s `devServer` (see UPSTREAM.md); this is
the local stopgap and should be deleted when that lands.
*/
const staticDirs: string[] = (config as { staticDirs?: string[] })
  .staticDirs ?? ['static']
const outDir: string = (config as { outDir?: string }).outDir ?? 'docs'
const pending = new Map<string, ReturnType<typeof setTimeout>>()

for (const dir of staticDirs) {
  try {
    watch(dir, { recursive: true }, (_event, file) => {
      if (!file) return
      const rel = file.toString()
      // Editors and exporters write a file several times; settle before copying
      // so we do not read a half-written GLB.
      clearTimeout(pending.get(rel))
      pending.set(
        rel,
        setTimeout(async () => {
          pending.delete(rel)
          const from = join(dir, rel)
          const to = join(outDir, rel)
          try {
            // A directory event is not a file to copy, and a delete is not an
            // error worth shouting about.
            if (!(await stat(from)).isFile()) return
            await mkdir(dirname(to), { recursive: true })
            await copyFile(from, to)
            console.log(`static → ${outDir}: ${rel}`)
          } catch {
            /* removed or unreadable — the next full build will reconcile it */
          }
        }, 250)
      )
    })
  } catch (e) {
    console.warn(`could not watch ${dir}:`, e)
  }
}

await devServer(config)
