# PERF-DESIGN — acceleration: workers, wasm, and when NOT to

How we decide to make something faster, and what we've decided so far. The short version:
**measure, then move the smallest thing that pays.** Most of this repo should never go near
a worker or wasm, and saying so precisely is the point of this document.

## The rule: measure the SPLIT, not the total

A total tells you something is slow. It doesn't tell you whether anything can be done
about it. Always split the cost into:

- **movable** — plain arithmetic over numbers. A worker or wasm could take it.
- **immovable** — GPU uploads (`updateVerticesData`), DOM, engine calls. **Nothing** takes
  these off the main thread, ever.

`movableShare` is therefore the **ceiling on any threading or wasm win**, no matter how
enormous the raw operation count looks. `b3d-terrain` reports exactly this
(`profile` attribute → `debugState`), and any future hot spot should too.

## The goal is the WORST CASE, not throughput

And measure the **worst frame**, not the average. The hitch you feel is one saturated
frame; the mean tile cost is a number nobody experiences. **A change that improves average
throughput while adding to the tail is a straight loss.** In XR a dropped frame is nausea,
not jank.

This isn't just a reporting preference — it decides designs, and it cuts against the way
most parallel/streaming machinery is built:

- **Queues must be priority-ordered and droppable, not FIFO.** The tile we need now must not
  wait behind twenty tiles queued three frames ago that nobody wants. FIFO turns a spike
  into a stall. (Our tile pool already works this way: it fills by priority and _steals the
  weakest_.)
- **Work must be cancellable and replaceable.** After an origin reset or a hard turn, most
  queued work is instantly garbage; being unable to drop it _is_ the worst case.
- **Small jobs, partial results.** Batching work to amortise dispatch maximises throughput
  and maximises time-to-first-useful-result. Prefer one tile per job.
- **No allocation in the steady state.** A worst frame is as likely to be a GC pause as
  compute. Preallocate, reuse, ping-pong buffers.
- **Predictable per-job cost** — fixed capacity, no growth, no rare expensive path.
- **Idle must be free**, and warm-up must not happen during a burst (worker/pool startup is
  part of the worst case; pay it at scene start).

`worstFrameMs` and `worstFrameSaturated` exist on terrain's `debugState` for exactly this
reason — a mean would hide the only number that matters.

## What we already did (and why it came first)

**Terrain normals: ~4.3× fewer noise evaluations, in plain JS.** The normal at a vertex is
the height gradient central-differenced over ±e — but `e` _is_ the vertex spacing, so those
samples were literally the neighbouring vertices' heights, recomputed from scratch. Five
`heightAt` calls per vertex where one would do.

`terrain-grid.buildTileField` now samples a grid one ring wider than the tile and
differences the neighbours. Identical output — not an approximation (heights bit-identical,
normals to float32 rounding), pinned by a differential test against the old algorithm.

Measured, subs 24: **2.54 ms → 0.68 ms per tile**, and a saturated 24-tile frame goes
**~61 ms → ~16 ms**.

The lesson generalises: **do the algorithmic win before the technology win.** Porting a
5×-redundant algorithm to wasm and calling the result a wasm win is self-deception — and it
would have locked in the redundancy behind a much harder-to-change boundary.

## Design the batch boundary FIRST — it pays before wasm, and makes wasm a drop-in

The interface that makes a kernel movable is the same one that makes it fast in JS:

- **one call does a whole batch** — `buildTileField(...)`, `sampleGrid(...)` — not
  `noise3D(x, y, z)` per point;
- **caller-owned, preallocated buffers**, written in place. No allocation per frame, so no
  GC, and nothing to copy at a boundary;
- **pure** — no engine types in, plain numbers out. That's what keeps it unit-testable
  headlessly, which is what lets a port be _verified_ rather than hoped about.

`buildTileField` is deliberately shaped this way. If tile building ever moves to a worker
or to wasm, that function is the thing replaced, and its differential test becomes the
**conformance test for the port**.

## Fixed capacity, in-place mutation

Wasm rewards — and realtime rewards — a preallocated arena with a **fixed budget**
("up to N spheres"), mutated in place, rather than a structure that grows and shrinks.
This repo already converged on it in plain JS: the terrain **tile pool** is a fixed
`poolSize` that _steals the weakest by priority_ rather than growing; `fillBudget` is the
same idea on the time axis; `resource.ts` is a capacity pool.

Rules that follow:

- **Dense array + swap-remove**, not a sparse array with holes — every lane is live work,
  which is what SIMD wants. Hold a `handle → slot` map for anything that needs a stable
  reference.
- **Structure-of-arrays** (`xs[]`, `ys[]`, `zs[]`), not array-of-structs. This, not the
  fixed capacity, is what actually unlocks v128 (4 floats/op).
- **Never grow.** `memory.grow()` **detaches every JS TypedArray view** onto the old
  buffer — a stale view is a classic, maddening wasm bug. A fixed arena makes that class of
  bug impossible.
- **The limit is a policy, not an error.** The N+1th body evicts by priority (oldest debris,
  most distant agent) — the tile pool's steal-the-weakest, applied everywhere.
- **Capacity is an `auto` tier budget** (`resolveBudget`), not a hard-wired 1024. Quest 256,
  workstation 4096, same code. See CLAUDE.md, "Adaptive defaults".
- **Budget the PAIRS, not just the bodies.** "1024 spheres" is fixed in bodies but quadratic
  in pairs (524k). Without a fixed broadphase (uniform/hash grid, sort-and-sweep) a "fixed
  budget" smuggles an O(n²) back in.

## Workers: send the recipe, transfer the result

The reason most worker experiments disappoint is that people send the **data** —
structured clone, a copy in and a copy out — and the serialisation dwarfs the saving.

Ours inverts that, and only because the simulation is deterministic and parameterized:

- **in:** the _recipe_. A tile is `{cx, cz, subs, tileSize}` + terrain config (`seed`,
  scales, sampler kind). Tens of bytes. The worker rebuilds the exact same height function
  from the seed — that's determinism paying rent.
- **out:** positions + normals (~15 KB at subs 24), handed back by **transfer** — an O(1)
  pointer move, not a clone. Ping-pong the buffers so nothing is ever allocated.

So the membrane cost is small and constant while the work moved is milliseconds. **If you
find yourself sending the data, the worker is probably a loss.**

Two practical notes:

- You cannot clone a closure. Our `heightAt` closes over `PerlinNoise`, the gradient
  filters and the sampler, so "ship the function across the membrane" doesn't apply — the
  worker should **import the same ESM** and reconstruct the height function from params
  (determinism is what makes that reconstruction exact).
- **⚠️ `new Worker(url)` requires a SAME-ORIGIN script — which our own distribution story
  breaks.** A consumer who bundles from npm is fine (`new Worker(new URL('./x.js',
import.meta.url), {type:'module'})` — the bundler emits the worker on their origin). A
  consumer who imports us **unbundled from a CDN** (`cdn.tosijs.net`, esm.sh — exactly the
  zero-build-step consumption this library is designed for) gets a **cross-origin worker URL
  and it is blocked outright.**
  The escape: spawn from a **blob URL** (`URL.createObjectURL`), which inherits the
  _document's_ origin. The catch is that relative imports inside a blob worker resolve
  against the blob URL and break — so the blob must be a tiny shim that dynamic-imports the
  real worker by **absolute URL**, and the module graph loads normally from there.
  Note **service workers can NOT do this** — `navigator.serviceWorker.register()` demands a
  same-origin script and rejects `blob:`. Web workers only.
- **CSP:** a strict `worker-src 'self'` blocks blob workers. So the worker path must always
  degrade gracefully to the synchronous JS kernel — which we get for free, since the pure JS
  stays canonical.
- **No `SharedArrayBuffer` on GitHub Pages** — SAB needs COOP/COEP headers and Pages can't
  set them, so `3d.tosijs.net` can't have it. Transferables only. (This is fine.)

**A worker changes the state machine, not just the thread.** Async tiles collide with the
**floating origin**: a tile computed against pre-shift world coordinates that lands after a
`resetOrigin` must be rebased or discarded, and the pool needs a _pending_ state so an
in-flight tile isn't stolen. That's where the bugs would live.

## Status: what's justified today

**Nothing, yet — re-measure first.** The padded-grid fix cut the worst frame ~4×, which may
have demoted a terrain worker from _necessary_ to _nice_. Fly it, read `debugState`, and
decide with `movableShare` and `worstFrameMs` in hand.

If it's still hitching, the order is: **worker before wasm.** A blocking 16 ms burst made
into a blocking 5 ms burst still drops frames; off-thread makes it drop none. And in XR a
dropped frame is nausea, not jank.

## tjs-lang: a pinpoint accelerator, not a language migration

Inline wasm without the toolchain ceremony is a genuinely useful thing, and it's the _one
hot kernel_ case that today's wasm story serves worst — our own Jolt integration (a
`wasm-compat` shim copied into `static/` plus a per-page importmap) is the tax made
visible.

**Adopt it surgically:**

- keep `tsc` in the publish path — `dist/` stays plain, unminified, browseable per-file JS +
  `.d.ts`, which is a _feature_ of this library;
- the **pure JS stays canonical** — the tested reference and the spec;
- wasm is an **optional accelerator** behind the same batch interface, with a **differential
  test asserting the two agree**. A consumer who doesn't want a wasm blob doesn't get one.

**Do NOT transpile the whole codebase.** It would put a young toolchain in front of every
published file, and transpiler bugs are the worst class — invisible in review, impossible-
looking at runtime, and they add a permanent _"...or maybe the transpiler did it"_ branch to
every future debugging session. Also: of the real bugs in this repo's recent history (a
missing import, a dropped optional field, a boost gate that type-checked perfectly, a native
memory leak), **runtime type contracts would have caught exactly none.** `tsc`, tests, and
flying it caught them. That's where the leverage is.

## The candidate list

**Wasm-shaped (batch, buffer-out, SIMD-friendly) — when measurement demands it:**

- **noise sampling in bulk** — `sampleGrid`-style. Serves terrain, `b3d-planet`,
  `b3d-star-system`; the widest-leverage kernel we have.
- **heightfield collision queries** — "project these N points onto the terrain." Everything
  that walks or drives on terrain needs it.
- **debris / particle fields** — hundreds to thousands of bodies, integrate + a height test.
  No solver, no constraints.
- **crowd / flock / steering** — the big one, and **the forcing function is the AI scenario
  harness** (AI-DESIGN.md). A handful of agents is free; 50–200 agents doing avoidance is
  the frame budget. Design the steering API to take _arrays_ now, so the kernel can drop in.

**Explicitly NOT:**

- **Rigid-body physics.** Jolt _is already wasm_, and it's a mature solver (broadphase,
  islands, sleeping, CCD, constraints). Re-implementing it would be years of work to be
  worse, and the toolchain tax we'd be avoiding is already paid.
- **The per-entity models** — `fly-by-wire`, `guidance`, `ballistics`, `radar`, `hud-math`,
  `world-store`. A handful of entities, tiny functions, a few calls a frame: the boundary
  crossing costs more than the math, and we'd trade away the headless testability that makes
  them trustworthy. Wasm here is a _pure loss_.

**The failure mode to watch for in any of the above:** a JS loop calling a wasm function
_per body_. You pay the crossing N times and lose to plain JS. State lives in the arena;
cross once per frame.
