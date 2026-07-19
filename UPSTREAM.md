# Upstream

Ecosystem findings that belong in another repo (`tosijs`, `tosijs-ui`, `tjs-lang`, the build
system) — recurring footguns tosijs-3d works around. **File, don't fix**: never edit the upstream
repo from here; open an issue there and mirror its URL below. Surfaced by the 0.5.0 nine-lens
review; none block a release, but they compound (this release re-hand-guarded the same footguns
across four new components).

| Repo | Finding | Issue |
| --- | --- | --- |
| `tonioloewald/tosijs` | **`elementCreator` should warn when a declared class-field prop collides with the `on*`→`addEventListener` binding.** The single most-repeated tax: `b3d-controller.ts`, `b3d-destroyable.ts`, `b3d-spawner.ts`, `b3d-death.ts` each carry an identical "deliberately NOT named `onX`" guard + comment. A definition-time warning would delete the whole class of silent-null-callback bugs. | [tosijs#14](https://github.com/tonioloewald/tosijs/issues/14) |
| `tonioloewald/tosijs` | **`foo: true` in `initAttributes` should be a definition-time error.** An HTML boolean attribute can never default true (absent → false); it "killed the trigger" silently. All four new components correctly invert to `disabled`/`'on'\|'off'`, but the prose is hand-cited every release — move it to enforcement. | [tosijs#15](https://github.com/tonioloewald/tosijs/issues/15) |
| `tonioloewald/tosijs` | **Surface a first-class "semantic parent" accessor** so a nested child needn't know about the `<tosi-slot>` wrapper. `semanticParent()` is the current stopgap, hand-rolled here. | [tosijs#16](https://github.com/tonioloewald/tosijs/issues/16) |
| `tonioloewald/tjs-lang` | **All-caps identifier reassignment is rewritten to `const`,** shadowing a module-level `let` (bit the exploder/physics demos). | [tjs-lang#22](https://github.com/tonioloewald/tjs-lang/issues/22) |
| `@babylonjs/loaders` (third-party) | **`babylonjs-gltf2interface` is pulled into the dep graph purely to satisfy `@babylonjs/loaders@9`'s type peer** for the emitted `.d.ts`. A types-only package promoted to a peer pushes resolution down the whole consumer chain. **Not filed** — it's a third-party (Babylon) packaging choice, not our repos, and it's already handled locally (parked in `devDependencies`). Recorded here for awareness only. | n/a (handled locally) |

## Incoming

`gh issue list -R tonioloewald/tosijs-3d` is empty (open and closed). 0.5.0 closes no incoming
issue and is not reframed by any downstream port.
