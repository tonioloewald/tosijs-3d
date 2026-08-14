# Releasing tosijs-3d

How a release is cut. The npm package ships **per-file, unminified `dist/` JS +
`.d.ts` + sourcemaps** (browseable source for consumers and AI agents), and the
doc site (`docs/`, the GitHub Pages web root at `3d.tosijs.net`) is rebuilt from the
same source. Both are produced by `bun run build` and are committed to `main`.

## Prerequisites

- On `main`, working tree clean (see the dev-server caveat below).
- `bun install` up to date.
- Publishing rights to the `tosijs-3d` npm package (for the publish step, which is
  done manually — see step 8).
- Optional: `PREVIEW_HOST=user@box` in your shell for `bun run tunnel`/`deploy` —
  the host is deliberately NOT committed (public repo); unset simply means those
  scripts are unconfigured.

> **`dist/`, `docs/`, and `llms.txt` are generated build artifacts, committed to
> `main`.** They are regenerated deterministically by the release build (step 4) and
> are _expected to be stale/dirty on `main` between releases_ (the dev server rewrites
> `docs/` constantly). Don't hand-edit them, and don't treat their staleness as a
> defect — a reviewer seeing a stale barrel or doc page is seeing normal between-release
> state, not a bug. Source of truth is `src/` (`index.ts` exports + `src/docs/*` tocs).

## The dev-server caveat

`bun start` runs `buildSite()` on every file change and **continuously rewrites
`docs/iife.js`**. It will re-dirty the tree between `git add` and `git commit`, so a
release can't produce a clean commit while it's running. **Stop the dev server before
cutting a release.**

## Steps

1. **Stop the dev server** (Ctrl-C the `bun start` process) so it stops touching
   `docs/`.

2. **Confirm a clean tree** — nothing outstanding except, at most, dev-server
   `docs/` churn which the build in step 4 overwrites deterministically:

   ```sh
   git status --short | grep -vE ' (docs|dist)/'   # should print nothing
   ```

   `dist/` is filtered for the same reason as `docs/`: step 4's build rewrites
   both deterministically, so churn there before the build means nothing. A
   dirty tree **after** steps 4–5 is the signal that matters.

3. **Bump the version** in `package.json` (`"version"`). This is a `0.x` package, so
   semver is loose, but as a rule of thumb: new/changed public API or an
   architectural shift → **minor** (`0.N.0`); pure fixes → **patch** (`0.N.M`). The
   B3dChild lifecycle release (new exported `B3dChild` + pull-model refactor + tosijs
   dep bump) was a **minor** bump. **A peer-dependency break (e.g. Babylon 8 → 9) is
   at least a minor and MUST be called out in the changelog + migration note (below).**

3a. **Write the changelog** — add a section to `CHANGELOG.md` for this version:
headline Added/Changed/Fixed, and — critically — a **⚠️ Breaking** block for any
peer-dependency range change (what moved, and what the consumer must do). A
`^8`-pinned consumer hitting an `ERESOLVE` deserves a note that says why.

3b. **Map-drift gate** — every new `src/*.ts` this release must be in **both**
`CLAUDE.md`'s "Key Files" table **and** its category doc toc (`src/docs/*.md`).
The tocs are easy to remember (they gate the doc build); the CLAUDE.md map is the
one that silently rots. Quick check: `git diff --name-only <lasttag>..HEAD -- 'src/*.ts' | grep -v test`
and confirm each is mentioned in `CLAUDE.md`.

4. **Full build** — regenerates `docs/` (doc site + `iife.js`) **and** `dist/` (the
   library: `tsc -p tsconfig.build.json`, run by `buildSite()` because
   `emitLibrary: true`):

   ```sh
   bun run build      # = bun bin/site.ts --build
   ```

   ⚠️ `run` is required. `build` collides with Bun's own `bun build` subcommand, so
   bare `bun build` invokes Bun's bundler and dies with "Missing entrypoints" instead
   of running our script.

5. **Verify** — types + tests + lint:

   ```sh
   bun run typecheck                          # tsconfig.json — the WHOLE repo: tests, demo/, site.config.ts
   bunx tsc -p tsconfig.build.json --noEmit   # tsconfig.build.json — the shipped library only
   bun test
   bun format         # ESLint --fix + Prettier; re-run build if it changes anything
   ```

   **Both configs, deliberately.** `tsconfig.build.json` excludes `src/**/*.test.ts`
   and `site.config.ts` — the exact files that went red and stayed red across a
   tagged rc in 0.7.0, hiding four real errors, because the only typecheck anyone
   ran was the build's. `bun test` strips types and cannot substitute.

5a0. **Re-check `UPSTREAM.md`'s Open rows** — `gh issue view` each one. Upstream
issues get fixed while we're not looking, and a stale Open row is worse than no
row: it asserts a workaround is still needed. (`tosijs-ui#63` sat in Open for a
release after being closed.)

5a. **Review gate** — for a minor/major: run the nine-lens pre-release review
(`/pre-release-review`) at **full** depth on the first rc, and a **fast**-depth
gate over `<last-rc>..HEAD` before tagging the final. Tag only on GO /
GO_WITH_FOLLOWUPS — and file every follow-up before moving on (BLOCK means fix
and re-gate). The bump + changelog may sit committed "awaiting gate"; the TAG
waits. (For step 3b's map-drift check on a final-after-rcs, diff against the
last **stable** tag, not the last rc.)

> **The rc may be tagged BEFORE the gate when a consumer is waiting.** Getting
> a release candidate into an adopter's hands buys feedback the review can't
> produce (manta-recon found things no lens would), and an rc is explicitly a
> "this may change" artifact — that's what the `next` dist-tag means. When you
> do it in this order, say so in the rc notes, and treat the gate's findings as
> blocking the FINAL, not the rc. The rule that stays hard: **the final tag
> waits for GO.**

6. **Commit** the version bump + rebuilt `dist/` + `docs/`:

   ```sh
   git add -A
   git commit -m "[release] vX.Y.Z — <one-line summary of the headline changes>"
   ```

7. **Tag** the release (annotated) — `vX.Y.Z`, matching the existing tag history
   (`v0.3.0`, `v0.4.0`, …):

   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   ```

8. **Publish to npm** — **manual, done by a human** (not automated here):

   ```sh
   npm publish        # publishes ./dist per package.json "main"/"exports"/"types" + "files"
   ```

   Confirm afterwards: `npm view tosijs-3d version`.

   ### ⚠️ Prereleases (`-rc.N`, `-beta.N`)

   A bare `npm publish` sets npm's **`latest`** dist-tag — every plain
   `npm i tosijs-3d` would then install the rc. For any `X.Y.Z-rc.N` version:

   ```sh
   npm publish --tag next          # rc installs via `npm i tosijs-3d@next` only
   ```

   Tag format matches the release tags with the prerelease suffix
   (`v0.6.0-rc.1`). Mark the GitHub release as a prerelease if you cut one
   (`gh release create vX.Y.Z-rc.N --prerelease`). The final release then
   publishes normally — its bare `npm publish` takes `latest` and supersedes
   the rc. If a bare publish of an rc ever happens by accident, repoint the
   tag rather than unpublishing:

   ```sh
   npm dist-tag add tosijs-3d@<last-stable> latest
   npm dist-tag add tosijs-3d@<rc-version> next
   ```

   (Shared process: `tosijs-coding-practices/practices/releasing.md` §
   prerelease tagging — this section is the project-local restatement at the
   load-bearing step.)

9. **Push** `main` + tags (Claude waits for an explicit nudge before any push):
   ```sh
   git push && git push --tags
   ```
   GitHub Pages redeploys from `main`'s `/docs` folder automatically.

## What Claude does vs. what you do

By standing request, Claude runs steps **1–7** (stop server → bump → build → verify →
commit → tag) and **stops before publish**. Steps **8 (npm publish)** and **9 (push)**
are yours — Claude won't publish, and won't push without an explicit go-ahead.
