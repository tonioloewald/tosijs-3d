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

2a. **⚠️ GATE: the PREVIOUS tag must be on npm before you cut a new one.**

```sh
npm view tosijs-3d version          # what the registry has
git tag --list 'v*' | sort -V | tail -1   # what we last claimed
```

Tonio: _"you shouldn't cut new tags if the previous one hasn't been published."_

A tag is a claim that a released artifact exists. Cutting the next one over an
unpublished tag makes that claim false and leaves an orphan nobody notices —
`v0.7.3` was tagged and never published, and it only surfaced two releases later
when the tag list and the registry were compared side by side. The content was
not lost (0.7.4 is cumulative, so mantling and the swim rewrite shipped inside
it), which is exactly why nothing complained: **the failure is silent, and the
artifact being fine is what keeps it silent.**

If the previous tag is unpublished, decide before going further:

- **publish it** if it should exist; or
- **delete the tag** (`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`)
  and roll its changelog into the next version.

Checking every tag rather than only the last one is a one-liner, and worth it:

```sh
npm view tosijs-3d versions --json | tr -d ' "\n[]' | tr ',' '\n' | sort -V > /tmp/pub
git tag --list 'v*' | sed 's/^v//' | sort -V > /tmp/tags
comm -23 /tmp/tags /tmp/pub          # tags with no published artifact
```

Prerelease tags (`-beta.N`) may legitimately have no artifact — they are gates,
not releases. A bare `vX.Y.Z` with none is the thing to catch.

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
one that silently rots. Quick check:

```sh
for f in $(git diff --name-only <lasttag>..HEAD -- 'src/*.ts' | grep -v test \
             | xargs -n1 basename | sed 's/\.ts$//'); do
  grep -q "$f\.ts" CLAUDE.md || echo "MISSING: $f"
done
```

Match on the bare `<name>.ts`, with **no surrounding backticks**. Rows are
written both ways — `` `src/keyboard.ts` `` for most, and a bare
`` `b3d-star-system.ts` `` where one row documents two files — so any pattern
anchoring on a leading backtick misses the `src/`-prefixed majority.

That is not hypothetical: the previous version of this gate grepped for
`` `$f.ts` `` and reported `keyboard` and `tosi-b3d` MISSING while both sat in
the table (0.7.7). A gate that cries wolf on its most common input is worse than
no gate — it teaches you to skim past the one time it is right.

3c. **If this release RENAMES anything, sweep the docs and demos.** A rename is
done when the corpus that teaches it is done too. 0.8.0's flagship `/ui/` page
still taught the deprecated spelling on eight call sites, and one —
`iconGrid3d({onSelect})` — was **silently dead** rather than deprecated, because
that widget had only ever had the new name. The page documenting the fix
demonstrated the exact bug the release was cut to eliminate.

```sh
grep -rn '<oldSpelling>:' src/docs/ demo/ src/*.ts
```

Include the `/*# */` doc comments — that is where the examples live, and **they
are not type-checked**, so nothing else will catch it.

4. **Full build** — regenerates `docs/` (doc site + `iife.js`) **and** `dist/` (the
   library: `tsc -p tsconfig.build.json`, run by `buildSite()` because
   `emitLibrary: true`):

   ```sh
   bun run build      # = bun bin/site.ts --build
   ```

   ⚠️ `run` is required. `build` collides with Bun's own `bun build` subcommand, so
   bare `bun build` invokes Bun's bundler and dies with "Missing entrypoints" instead
   of running our script.

4a. **Size** — print what this release costs a consumer against the committed
baseline, and put the barrel line in the CHANGELOG entry:

```sh
bun run sizes             # barrel (min, packages external) + dist total, with deltas
bun run sizes --record    # after tagging: the new baseline, committed with the release
```

The build does not print a size, so a release that grew was invisible until a
reviewer bundled the barrel by hand (0.8.3 gate, m4).

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

5a. **MINOR AND MAJOR ONLY — drive every demo, flat AND in VR.** A human, on the
real thing, page by page.

This is not a formality and it is not covered by anything above. Every time it
has been done it has been a goldmine, and the reason is structural: the tests
pin PURE models, and almost every bug that actually reaches an adopter is a
COMBINATION — a value that is right on a monitor and wrong on a phone, an effect
tuned for a walker that fails on a vehicle, a panel that fights the camera for a
tap. None of those can fail a unit test, because none of them is wrong in
isolation.

The 0.7.0 cycle in one session, all found this way and none by the suite:

- the pause panel read a tap as a zoom, then hid itself out of reach
- the same panel was wider than a portrait viewport, so its button was off screen
- `b3d-death`'s panel had both problems, at the worst possible moment
- the HUD circle ate 70% of the width in portrait vs 36% in landscape
- the glass gamepad fades away and won't come back once a trackpad exists
- a scene that respawned by its own route made `b3d-death` swallow every death
  after the first

**What "drive" means:** fly/walk/drive it, crash it, pause it, rotate the phone,
enter and leave VR. Not "does it load".

Log what you find rather than fixing in place — a list at the end beats six
half-finished fixes — and file anything not fixed this cycle on the board
(`virta create … --tags kind:bug,area:xr`) with the platform it was seen on.

5a0. **Re-check the open upstream cards** (`virta ls "project:tosijs-3d notes:upstream"`) — `gh issue view` each one. Upstream
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
   (`v0.3.0`, `v0.4.0`, …) — **locally, and push it only in step 9**, after the
   dry run is green:

   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   ```

   A tag that has been pushed should never have to move. That is why the dry run
   (step 8) comes before the tag is pushed: tosijs-ui's pilot moved its tag five
   times. If the dry run finds something, fix it, amend the release commit, and
   re-tag locally (`git tag -f -a vX.Y.Z …`); nothing outside this machine has
   seen the tag yet. The version's CHANGELOG section stays editable until the
   approval: the freeze binds on PUBLICATION, not on tagging.

7a. **If it is a prerelease an adopter needs, drop the tarball where they can
find it** — `../local-packages/`, not a scratchpad, not loose in `/tmp`:

```sh
npm pack --pack-destination ../local-packages
shasum -a 256 ../local-packages/tosijs-3d-<version>.tgz
```

Then update `../local-packages/PROVENANCE.md`: tag, the commit actually
packed from (say so if it is ahead of the tag), tree state, timestamp,
sha256. A `file:` dep has no registry and no integrity hash, so that note is
the supply chain. Never overwrite a tarball in place; delete superseded ones;
drop the entry entirely once npm has the version.

The rule and its traps live in `tosijs-coding-practices/practices/releasing.md`
("Bypassing the publish loop") — written by an adopter who could not find
tarballs packed into a session scratchpad.

8. **Dry-run the publish, THEN tag.** The publish runs in GitHub Actions
   (`.github/workflows/publish.yml`, the shared template —
   `tosijs-coding-practices/practices/publishing-via-oidc.md`). Before the tag
   exists, push the release commit and run every check up to staging:

   ```sh
   git push
   gh workflow run publish.yml -f tag=main -f dry_run=true
   gh run watch "$(gh run list --workflow publish.yml -L 1 --json databaseId -q '.[0].databaseId')" --exit-status
   ```

   It rebuilds from the frozen lockfile with the pinned Bun (`.bun-version`)
   and **fails if any committed build file differs**, packs, runs
   `bun run test-consumer` (`bin/smoke-consumer.ts`: the tarball installed by
   npm with its peers, a strict typecheck of our `.d.ts`, the pure subpaths
   under plain Node), then `release-doctor`. A failure here costs nothing: no
   tag to move, no version number burned.

   ⚠️ `docs/` and `dist/` are only committed in the release commit, so a dry run
   on `main` between releases fails the reproduce check by design. To rehearse
   mid-cycle, use a throwaway branch in a `git worktree` (build, commit both,
   dry-run the branch, delete it); that keeps the dev server untouched.

9. **Tag, push the tag, and dispatch the real run:**

   ```sh
   git push origin vX.Y.Z
   gh workflow run publish.yml -f tag=vX.Y.Z
   ```

   The run checks the tag matches `package.json`, repeats every check, then
   **stages** the tarball (`npm stage publish`); it cannot publish on its own.
   **Tonio approves it with 2FA**: npmjs.com → tosijs-3d → *Staged Packages*
   (it works from a phone). The run waits up to an hour, then verifies that
   the published bytes equal the staged tarball, the dist-tag is right, and the
   consumer smoke passes on the registry's copy. **A green run is the statement
   that it is published.** If the approval came after the hour, re-run with
   `-f verify_only=true`.

   **The dist-tag is derived, not chosen:** `-rc.N` → `rc`, `-beta.N` → `beta`,
   `-alpha.N` → `alpha`, otherwise `latest`. A prerelease can never take
   `latest`, and the run fails if one would. (Before this flow, rcs went out
   by hand under `next`.) Mark a prerelease's GitHub release as one if you cut
   it (`gh release create vX.Y.Z-rc.N --prerelease`).

   GitHub Pages redeploys from `main`'s `/docs` folder automatically. At a
   release, `virta githubPush tosijs-3d` closes the GitHub issues whose cards
   were closed as fixed for this version.

## What Claude does vs. what you do

Claude runs steps **1–9**: stop the server, bump, build, verify, commit, dry-run,
tag, and dispatch the real run. **Tonio's 2FA approval on npmjs.com is the go.**
Nothing is public until he approves, so dispatching is safe. There is no stored
npm token and CI cannot publish on its own (the Trusted Publisher entry allows
staging only). For a minor or major, step 5a's human pass through every demo
still happens before the tag.
