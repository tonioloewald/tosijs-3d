# Upstream

Issues tosijs-3d has filed on the repo that **owns** the code — an index, not a record. The
issue is the record: context, workaround and suggestion live there, self-contained. Keeping a
second copy here just lets the two drift, so a row is one line plus the link.

"Upstream" is a legacy filename, not a routing rule — the owner may be a dependency, a dev tool,
or a sibling. See `tosijs-coding-practices/practices/cross-project.md`.

**File, don't fix**: never edit the owning repo from here. File first, link second — a row with
no issue URL is a complaint nobody will ever read.

## Open

| Owner       | Finding                                                                                                                                               | Issue                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `tosijs`    | `on*`→event sugar shadows prototype **methods**, not just creator-config keys (narrowed: the warning shipped in 1.6.8, the namespace question stands) | [tosijs#22](https://github.com/tonioloewald/tosijs/issues/22)       |
| `tosijs`    | No first-class "semantic parent" accessor — children hand-roll a walk past `<tosi-slot>`                                                              | [tosijs#16](https://github.com/tonioloewald/tosijs/issues/16)       |
| `tjs-lang`  | All-caps identifier reassignment rewritten to `const`, shadowing a module-level `let`                                                                 | [tjs-lang#22](https://github.com/tonioloewald/tjs-lang/issues/22)   |
| `haltija`   | Tab selection follows focus, not cwd — commands can land on another project's page                                                                    | [haltija#2](https://github.com/tonioloewald/haltija/issues/2)       |
| `haltija`   | `hj console` captures `console.*` but not uncaught exceptions                                                                                         | [haltija#9](https://github.com/tonioloewald/haltija/issues/9)       |
| `haltija`   | No first-class verbs for driving tosijs-ui live examples                                                                                              | [haltija#10](https://github.com/tonioloewald/haltija/issues/10)     |
| `tosijs-ui` | Ship the remote-access tooling (`tunnel`/`deploy`) as package bins                                                                                    | [tosijs-ui#27](https://github.com/tonioloewald/tosijs-ui/issues/27) |
| `tosijs-ui` | Published beta lags its own repo's tunnel tooling, silently                                                                                           | [tosijs-ui#28](https://github.com/tonioloewald/tosijs-ui/issues/28) |
| `tosijs-ui` | Tunnel hostnames need a shared-Caddyfile edit; nothing allocates `remotePort`                                                                         | [tosijs-ui#29](https://github.com/tonioloewald/tosijs-ui/issues/29) |
| `tosijs-ui` | `make-icon-data` strips `fill-rule`, breaking compound-path art                                                                                       | [tosijs-ui#30](https://github.com/tonioloewald/tosijs-ui/issues/30) |
| `tosijs-ui` | Site build emits the hydrate bundle into the library `dist/`                                                                                          | [tosijs-ui#31](https://github.com/tonioloewald/tosijs-ui/issues/31) |
| `tosijs-ui` | `chokidar` is a runtime import but only a `devDependency`                                                                                             | [tosijs-ui#32](https://github.com/tonioloewald/tosijs-ui/issues/32) |
| `tosijs-ui` | Raw icon-data markup isn't public API (SVG-texture consumers have no DOM)                                                                             | [tosijs-ui#33](https://github.com/tonioloewald/tosijs-ui/issues/33) |
| `tosijs-ui` | live-example "save local" fails silently when `editableSources` is off                                                                                | [tosijs-ui#34](https://github.com/tonioloewald/tosijs-ui/issues/34) |

## Resolved

| Owner       | Finding                                                            | Fixed in                                                                 | Issue                                                         |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `tosijs`    | Warn when a declared prop collides with the `on*`→listener binding | tosijs **1.6.8** (`_warnOnHandlerCollisions`, points at `handle<Event>`) | [tosijs#14](https://github.com/tonioloewald/tosijs/issues/14) |
| `tosijs`    | `foo: true` in `initAttributes` should be an error                 | tosijs — now **throws** at construction                                  | [tosijs#15](https://github.com/tonioloewald/tosijs/issues/15) |
| `haltija`   | Hidden tab indistinguishable from a broken page                    | haltija **1.5.0** (warning), **1.5.2** (deduped)                         | [haltija#3](https://github.com/tonioloewald/haltija/issues/3) |
| `tosijs-ui` | Doc-browser header logo hard-coded                                 | tosijs-ui **1.7.4** (`SiteConfig.logo`)                                  | —                                                             |

## Not filed

| Owner                | Finding                                                                                        | Why not                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@babylonjs/loaders` | `babylonjs-gltf2interface` promoted to a type peer, pushing resolution down the consumer chain | Third-party (Babylon) packaging choice, not our ecosystem; handled locally by parking it in `devDependencies` |

## Incoming

`gh issue list -R tonioloewald/tosijs-3d` is empty (open and closed). Nothing filed against us.
