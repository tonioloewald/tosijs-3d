# Releasing tosijs-3d

How a release is cut. The npm package ships **per-file, unminified `dist/` JS +
`.d.ts` + sourcemaps** (browseable source for consumers and AI agents), and the
doc site (`docs/`, the GitHub Pages web root at `3d.tosijs.net`) is rebuilt from the
same source. Both are produced by `bun build` and are committed to `main`.

## Prerequisites

- On `main`, working tree clean (see the dev-server caveat below).
- `bun install` up to date.
- Publishing rights to the `tosijs-3d` npm package (for the publish step, which is
  done manually — see step 8).

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
   git status --short | grep -vE ' docs/'   # should print nothing
   ```

3. **Bump the version** in `package.json` (`"version"`). This is a `0.x` package, so
   semver is loose, but as a rule of thumb: new/changed public API or an
   architectural shift → **minor** (`0.N.0`); pure fixes → **patch** (`0.N.M`). The
   B3dChild lifecycle release (new exported `B3dChild` + pull-model refactor + tosijs
   dep bump) was a **minor** bump.

4. **Full build** — regenerates `docs/` (doc site + `iife.js`) **and** `dist/` (the
   library: `tsc -p tsconfig.build.json`, run by `buildSite()` because
   `emitLibrary: true`):

   ```sh
   bun build          # = bun bin/site.ts --build
   ```

5. **Verify** — types + tests + lint:

   ```sh
   bunx tsc -p tsconfig.build.json --noEmit   # (build already ran tsc; this is a belt-and-suspenders check)
   bun test
   bun format         # ESLint --fix + Prettier; re-run build if it changes anything
   ```

6. **Commit** the version bump + rebuilt `dist/` + `docs/`:

   ```sh
   git add -A
   git commit -m "[release] vX.Y.Z — <one-line summary of the headline changes>"
   ```

7. **Tag** the release (annotated). NOTE: this repo has no `vX.Y.Z` tag history yet —
   establish the convention here:

   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   ```

8. **Publish to npm** — **manual, done by a human** (not automated here):

   ```sh
   npm publish        # publishes ./dist per package.json "main"/"exports"/"types" + "files"
   ```

   Confirm afterwards: `npm view tosijs-3d version`.

9. **Push** `main` + tags (Claude waits for an explicit nudge before any push):
   ```sh
   git push && git push --tags
   ```
   GitHub Pages redeploys from `main`'s `/docs` folder automatically.

## What Claude does vs. what you do

By standing request, Claude runs steps **1–7** (stop server → bump → build → verify →
commit → tag) and **stops before publish**. Steps **8 (npm publish)** and **9 (push)**
are yours — Claude won't publish, and won't push without an explicit go-ahead.
