# NATIVE-DESIGN.md: tosijs-3d without a browser

A briefing for whoever plans this project (Tonio's side project, discussed
2026-11-14): as much of tosijs-3d as a game needs, running natively in Rust,
so it reaches Apple TV, consoles, and native desktop and mobile builds.
Nothing here is built yet. Part 1 is the design as discussed; part 2 is what
you need to know about the codebase you are porting; part 3 is the traps.

---

# Part 1: the design

## Why

Performance, and devices the web cannot reach. Apple TV has no WebView an app
may use; consoles have no browser at all. tosijs-3d today is TypeScript on
Babylon.js, built as DOM custom elements, published as an npm package and a
doc site (https://3d.tosijs.net, every page a live demo).

## Why this does not contradict PLATFORM.md

Read `PLATFORM.md` first. It argues AGAINST a renderer abstraction, and its
reason stands: what ties us to the web is the DOM and WebXR, not Babylon, so
swapping Babylon for another renderer frees us from nothing. That argument
assumed the web was the only target. Reaching Apple TV and consoles means
replacing the DOM as well as Babylon, and this project replaces both.

Two consequences:

- The web build stays Babylon. Do not put a renderer interface into the
  TypeScript library (PLATFORM.md §5: "a permanent tax on every component").
  The native engine is a separate implementation of the same SCENE LANGUAGE,
  not a backend behind an abstraction.
- XR stays on the open web (WebXR). Nothing here needs to do XR natively.

## The shape: XML for the tree, AJS for the code, Rust for the work

A scene gets three things from the library: a TREE (elements and attributes),
CODE (callbacks) and WORK (rendering, simulation). Natively each gets its own
answer:

| | Web (today) | Native |
| --- | --- | --- |
| Tree | DOM custom elements (`<tosi-b3d>`, `<tosi-b3d-sun>`, …), tosijs bindings | XML with the same element and attribute names |
| Code | JS functions (`drive`, `handleChange`, `whenDestroyed`, `scenePanel` hooks) | AJS, run by tjs-lang's Rust VM |
| Work | Babylon.js plus our pure TS modules | Rust on wgpu (Metal, Vulkan, DX12, WebGPU) |
| UI | SVG panels the browser rasterizes onto textures | the same SVG, drawn by resvg or vello |

### The tree: XML

A scene is already authored as a tree:

```js
b3d({ glowLayerIntensity: 1 },
  b3dSun({ shadowTextureSize: 2048 }),
  b3dSkybox({ timeOfDay: 6, realtimeScale: 100 }),
  b3dLoader({ url: './scene.glb' }),
  b3dWater({ y: -0.2 }))
```

The same tree as XML is the same scene. The schema is mostly written:

- `static/attributes.json` (and `attributes.txt`): every element attribute,
  GENERATED from source by `bin/attribute-index.ts` on each build.
- `src/scene-schemas.ts`: JSON Schema for the scene primitives (sky, sun,
  water, fog, clouds, ambient, light) with ranges, units, enums and log
  hints; `scene-schemas.test.ts` fails on drift from the elements.
- Data formats already exist as documents: rig recipes (`rig-recipe.ts`),
  effect recipes (`effect-recipe.ts`), material recipes
  (`material-recipe.ts`), light settings (`light-settings.ts`), character
  files (`character-file.ts`), `WorldState` (`world-contract.ts`). Each has a
  validator and a schema, and each slots into a scene document as a child or
  a file reference.

Generate the XML schema from those, never by hand, so the native reader stays
in step with the web elements by construction. (A hand-copied schema drifted
in an adopter's project: 6 of skybox's 16 attributes. That is why
`scene-schemas` exists.)

What the DOM provides that XML alone does not:

- LIFECYCLE. Elements attach, detach and MOVE. On the web, `B3dChild` (in
  `b3d-utils.ts`) is a pull model: each child attaches itself via
  `owner.whenReady(cb)`, and a move fires disconnect then connect in one task
  (so teardown is deferred a task). Natively, reconcile the document tree
  against the scene the way `world-view.ts` reconciles `WorldState` against
  meshes: appeared, changed, gone.
- BINDINGS. tosijs ties attributes to live state (the skybox's `timeOfDay`
  follows a slider). Natively that is a small reactive store and a binding
  syntax in the XML, e.g. `time-of-day="{world.time}"`. Undecided.

### The code: AJS

AJS is tjs-lang's sandboxed language (sibling repo `../tjs-lang`; read
`DOCS-AJS.md` and `docs/ajs-native-vm.md`). Facts that matter here:

- Source compiles to a versioned JSON AST (`$ajs` at the root); a VM walks it.
- Fuel-metered: every operation costs gas, so a run always halts.
- Capability-based: zero I/O by default; the host grants "atoms" (functions).
- A RUST AJS VM (Rust → wasm, and so equally a native crate) is ALREADY a tjs
  goal: tjs-lang board card #2853, "decided 2026-10-04 as the 1.0 critical
  path". It is theirs; do not plan to build it here. Depend on it.
- The VM accepts an AST, not source (`tjs-lang/vm-ast`, shipped 0.14.0); the
  Rust VM implements that same contract.
- Atoms return plain data: JSON plus `Date`, never host objects or functions
  (enforced by the membrane since tjs 0.14).

Why it fits a game engine:

- An interpreter needs no JIT. Consoles and Apple TV forbid JIT.
- Capabilities ARE the engine API: spawn, play a clip, damage, raycast, open
  a panel, read the scene clock.
- Fuel is a frame budget: a behaviour cannot hang a frame.
- Code is data: a scene document references or carries its behaviours, and
  the same behaviour runs on tjs's JS VM on the web and the Rust VM natively,
  so game logic is written once.
- Agents can write it safely: Ariosto (a narrative engine that drives worlds,
  `ARIOSTO-SIM.md`), WebMCP tools (`WEBMCP-DESIGN.md`) and players' own
  content (Dramatis, below) all run sandboxed.

Rules this implies:

1. AJS DECIDES, NATIVE CODE EXECUTES. Crossing into an interpreter costs, so
   AJS handles events and decisions (when to fire, where to go, what to say),
   and every per-frame loop (integrating a vehicle, skinning a crowd,
   stepping cloth) is a native capability. The AI design wants many small,
   cheap decisions (`AI-DESIGN.md`, "artificial stupidity"), which is this
   shape.
2. CAPABILITIES EXCHANGE PLAIN DATA. Entity ids and plain `{x, y, z}`
   values, never handles.
3. TIME COMES FROM THE SCENE. The world clock is a capability. A behaviour
   never reads AJS's `Date` for game time (see "No wall clock", part 2).
4. Two VMs must agree: run tjs-lang's golden AJS fixtures against both.

### The work: Rust

- wgpu covers Metal (Mac, iOS, Apple TV), Vulkan, DX12 and WebGPU; the same
  engine can run in a browser as wasm, which is how to compare it with the
  Babylon build side by side.
- EARLY DECISION: build on Bevy, or our own engine on wgpu. Bevy already has
  PBR, skinning, cascaded shadows, glTF and animation (roughly a year of
  work); our own is smaller, ours, and shaped to this library. Not decided.
- Shaders: our GLSL (inventory in part 2) ports to WGSL; naga translates
  GLSL mechanically, but our material PLUGINS inject code into Babylon's own
  PBR/Standard shaders at named hook points, so each needs an equivalent hook
  in the new PBR shader, not just a translation.
- The pure modules port to Rust with their tests as the spec (part 2).

## Performance, honestly

On the web a Rust renderer will not beat Babylon by much: our scenes are
mostly GPU-bound. The gains are in simulation (crowds, traffic, cloth,
retargeting, bone heat), in native overheads, and in reaching devices the web
cannot. Measure before promising a speed-up. `PERF-DESIGN.md` records where
wasm pays and where it is a pure loss, measured.

## Consoles last

wgpu has no public console backends, and console SDKs are under NDA (Bevy
console ports exist privately). Apple TV, desktop and mobile come almost free
with Metal and Vulkan; consoles need a licensed porting partner.

## Proposed steps

1. tjs's Rust AJS VM (tjs-lang #2853): theirs, already in progress as their
   1.0 critical path.
2. An XML schema generated from `attributes.json` and `scene-schemas`.
3. An inventory of the Babylon API each module uses (part 2 has the headline
   numbers), so scope is a list, not a guess.
4. THE SPIKE: a small scene read from XML; MakeHuman's body walking (skinned
   PBR, the skin shader, UAL's walk retargeted by ported Rust); one AJS
   behaviour ("walk to the beacon when clicked"); native and in a browser.
   It exercises the hardest path at once: skinning, a custom shader, ported
   pure code, glTF, AJS capabilities.
5. Then pure modules as native capabilities, in the order a game needs them.

## Open questions (Tonio's to decide)

- Bevy, or our own engine on wgpu?
- First native target: Apple TV, or native desktop?
- New repo, or a workspace beside this one? (Suggest a new repo; this one is
  a published npm package with real consumers.)
- Binding syntax, and how panel widgets bind to the store natively.
- Which callbacks become declarative events and built-in behaviours (open a
  panel, set a value, play a clip) rather than AJS.
- Audio: our effect voices are synthesised with Web Audio (noise and
  oscillators through filters, HRTF panning); natively that is a synth on a
  Rust audio crate.

---

# Part 2: the codebase you are porting

## Where things are

- `CLAUDE.md`: the map. Its "Key Files" table has one row per module with
  what it does and the traps found in it. Read it before anything else.
- The root `*-DESIGN.md` docs hold decisions AND rejected alternatives (the
  table at the top of CLAUDE.md lists them). The ones that matter most here:
  `PLATFORM.md`, `PERF-DESIGN.md`, `CHARACTER-DESIGN.md`, `AI-DESIGN.md`,
  `COLLISION-DESIGN.md`, `SPATIAL-DESIGN.md`, `UI-DESIGN-NOTES.md`.
- Shared engineering practices for the whole tosijs ecosystem:
  `../tosijs-coding-practices` (https://github.com/tonioloewald/tosijs-coding-practices).
- Work is tracked on the virta board (https://virta.tosijs.net), not in
  files. `virta brief` at session start; agents file into backlog, and
  `status:ready` is Tonio's go-ahead. Projects: `tosijs-3d`, `tjs-lang`, …
- Large assets (Quaternius, Kenney, MakeHuman, Tonio's models) live in the
  sibling `../static-assets` repo, served from `cdn.tosijs.net`; code reaches
  them through `assetUrl()`. Many tests read them from disk and SKIP when
  that repo is not checked out.

## Size (2026-11-14)

- `src/`: 356 non-test modules, about 248,000 lines including tests; 283 test
  files, about 3,870 tests, 0 failures is the bar (`bun test`, ~90 s).
- 226 of the 356 modules import no Babylon at all. Those are the portable
  logic and the first port candidates.
- Babylon classes used, by frequency (top of the list): Vector3, Scene,
  TransformNode, Color3, Mesh, Quaternion, MeshBuilder, AbstractMesh,
  StandardMaterial, Matrix, Texture, Material, VertexBuffer, NullEngine
  (tests), ArcRotateCamera, Observer, Camera, ShaderMaterial, PBRMaterial,
  FreeCamera, Ray, DynamicTexture, VertexData, AnimationGroup,
  DirectionalLight, ParticleSystem, LoadAssetContainerAsync (glTF), Skeleton,
  RawTexture/RawTexture3D, SpotLight, PointLight, ShadowGenerator, Bone,
  UniformBuffer, MaterialPluginBase, WebXR*. About 110 distinct classes.
- Material plugins (code injected into Babylon's PBR/Standard shaders):
  `skin-shading`, `hair-shading`, `cloth-shading`, `biome-plugin`,
  `caustics`, `cloud-shadows`, `b3d-ssao-projected`, `window-lights`,
  `water-shore-shader`, `seam-material`, `b3d-cloud-deck`, `b3d-crowd`
  (vertex animation). Plugins must be registered through
  `registerMaterialPlugin`, never Babylon's directly.
- Whole custom shaders: sky, planets, gas giants, stars and coronas, black
  hole, galaxy, light shafts, cloud deck, water shore.

## The pure modules: port these with their tests

The house discipline: computation lives in pure, deterministic,
Babylon-free modules on plain `{x, y, z}` / `{x, y, z, w}` objects, unit
tested headlessly; a thin `b3d-*.ts` bridges each to the scene. Examples,
by area:

- Vehicles: `fly-by-wire` (aircraft), `ground-vehicle` (cars, tanks: rigid
  body on contacts, our own model, deliberately NO physics engine),
  `city-traffic`.
- Combat: `resource`, `destroyable`, `warhead`, `ballistics`, `guidance`,
  `radar`, `hud-math`.
- Characters: `retarget` (humanoid roles across UE, Mixamo, Kenney, Blender
  names; world-space rotation transfer; foot IK; `armSpaceDeg`,
  `footTurnDeg`, `mirror`), `glb-clips`, `bvh`, `rig-fit`, `bone-heat`,
  `spring-chain`, `human-morph`, `proxy-fit`, `cloth-drape`, `remesh`,
  `body-sweep`, `skinned-glb`, `rigged-body-glb`.
- World: `world-store` (deterministic reference sim), `world-topology`,
  `min-sim-conformance`, `inventory`, `formations`, `mantle`, `buoyancy`.
- Terrain and environment: `terrain-grid`, `perlin-noise`, `landform`,
  `scatter`, `sdf-lattice`, `carve`, `city-layout`, `weather`, `lightning`,
  `light-modulation`, `effect-recipe`, `voxel-galaxy`.
- UI (Babylon-free SVG): `box`, `flow-layout`, `anchor-layout`, `surface`,
  `table`, `keyboard`, `text-edit`, `carry`, `widget-semantics`.

THE CHARACTER CORE is a promised engine-free subset (`character-core.ts` is
its doc page; `pure-core.test.ts` walks its import graph and fails on any
Babylon import). Dramatis (below) already consumes it from three.js, so it
is proven portable in principle and is the natural first Rust port.

Each `*.test.ts` is the spec for its module. Port the test cases to Rust with
the same inputs and tolerances; where a test reads real assets (UAL1.glb, the
MakeHuman pack), use the same files so the two implementations agree on real
data. `min-sim-conformance.ts` is the model: one conformance kit, two
implementations pinned to one behaviour.

## Conventions the native engine must keep

- UNITS: one unit is one metre, and a person is about 1.8 m. Movement
  constants (run speed 5 m/s, step-up 0.5 m) are human numbers.
- FRAMES: glTF's: +Y up, +Z forward, right-handed data; left is +X on a
  character facing +Z. Babylon is left-handed and its glTF loader puts a
  mirroring `__root__` node on top; `model-transform.canonicalize` strips it.
  `rig-build.ts` builds skeletons exactly as the glTF loader does
  (right-handed data under a mirror). A native engine that is right-handed
  throughout drops the mirror, but every place that compensates for it (hand
  sockets, `HAND_IN_ANATOMY` with det -1, sideOrientation) must be found and
  undone, not copied.
- Models are authored Blender-default: nose on local -Y, up local +Z; the
  exporter makes that glTF +Z forward. Never fix orientation per asset.
- ANGLES: degrees on the authoring surface. A `fooDeg` property is degrees;
  a name with no `Deg` sibling is already degrees. Pure maths modules use
  radians internally.
- Mesh name suffixes are behaviour: `_noshadow`, `_nocast`, `_mirror`,
  `-ignore`, `_collide*`, `_centerOfGravity`, `.model` (a library export).
  Read them with `conventionName()` / `publicName()` semantics.
- Callback names: factories take `handleX`, components take `whenX` or a
  verb (`drive`). `onX` is removed (tosijs binds `on*` props as DOM event
  listeners). Map these to AJS events and capabilities consistently.
- FLOATING ORIGIN: large worlds rebase. Everything with a world position
  either registers as a world root or listens for origin shifts
  (`registerWorldRoot`, `addOriginListener`). Native needs the same contract.
- ADAPTIVE BUDGETS: performance-sensitive defaults are `auto` (0), resolved
  per device tier from `perf-probe` budgets. Keep the idea: consoles and
  Apple TV are tiers.

## No wall clock, and determinism

World time comes from the scene: `sceneDelta(scene)` for a frame's step,
`sceneSeconds(scene)` for animation. They stop in a pause, follow
`timeScale`, and run the same in tests and replays. The system clock is read
ONLY in `src/clock.ts`; `clock.test.ts` fails on a read anywhere else. Pure
sims take time as `dt`/`tick` and use seeded PRNGs (`mersenne-twister`), never
`Math.random`. Native must keep this; it is what makes replays, tests and
network sync possible.

## The north star

Behavioural richness, not photorealism (`AI-DESIGN.md`, CLAUDE.md). Fidelity
is a promise: every step of visual realism raises the behaviour it must then
deliver. Performance headroom goes to agents and reactions, not vertices.
For a native port this means: chase simulation throughput and many agents,
not rendering features.

## Consumers to keep whole

- DRAMATIS embeds the character builder and has real
  users; it consumes the engine-free character core from three.js. Character
  formats (`character-file`, rig recipes, `riggedBodyGlb`'s export profile)
  are contracts with them.
- tosijs-3d-ensemble, manta-recon: adopters of the npm package.
- Ariosto drives worlds through `world-contract.ts` (`WorldApi`,
  `MinSimApi`): narrative-blind simulation, driver never load-bearing,
  events are commitments. Keep that contract natively; it maps cleanly onto
  AJS capabilities.

## The UI system

One UI, three surfaces: DOM, flat 3D, and VR, drawn from the same SVG and
layout. Panels are SVG built by `widgets3d` / `box` / `surface`, rasterized
onto textures (`svg-texture`), with pointer input mapped from a ray hit's UV
to SVG coordinates. Rendering and layout are symmetric across surfaces; only
input geometry differs. Natively: rasterize the same SVG (resvg or vello) and
keep the UV-to-viewBox input path. Icons are generated from `icons/*` into
`src/icon-data.ts`. Accessibility (`widget-semantics`, `aria-mirror`) reads
the same widget tree, and is dormant until used.

---

# Part 3: traps already found (do not rediscover them)

- glTF skinning: inverse bind matrices, joint nodes with the mesh beside
  them, top joints relative to nodes above them (an armature's rotation
  counts; Mixamo is centimetres under a 0.01 scale). `glb-clips.ts`
  `readGlbClips` reads all of this engine-free and is tested against
  Babylon's loader on UAL and Mixamo; port it rather than re-deriving.
- Retargeting: copy world-space rotation SINCE REST, lined up per role by
  rest direction; the body's axis (hips, spine, neck, head) and the feet and
  toes are NOT lined up (their rest lean is shape, not pose); hips travel in
  model space scaled by hip height. The reasons are comments in
  `retarget.ts`; each was a visible bug once.
- Bone heat (`bone-heat.ts`): weld split vertices first or seams become
  islands; cotangent Laplacian clamped; ~0.1–0.3 s for 1–6k vertices.
- Spring chains: fixed 120 Hz step with follow-the-leader correction, or the
  tip whips for ~15 s.
- Frame time: never use a whole-frame delta inside a per-camera callback
  (observers can run several times a frame); `sceneDelta` divides it.
- Two GPU contexts on one canvas fail silently (white meshes, dark sky); one
  scene, one engine.
- Transparent meshes are re-sorted per frame and flicker; UI panels are
  opaque rounded rects (`rounded-rect.ts`).
- A panel's visible face is local -Z; aiming +Z at the viewer shows its back
  (`dialog-placement.ts`).
- Particles: Babylon's particle time is not seconds unless `updateSpeed` is
  1/60; effect `scale` is Froude scaling (sizes ×k, speeds and lives ×√k,
  gravity unchanged).
- PBR physical falloff made pooled lamps invisible at 10 m; pooled lights
  use linear falloff to range. Clustered lighting makes falloff the cost.
- Picking thin instances walks every copy; the city answers rays from a box
  grid instead (`RayProxy` in `b3d-utils`).
- Projected AO: never sample the depth texture while drawing it (a silent
  feedback loop).
- GLSL lives in JS template strings here: a backtick in a shader comment
  ends the string. (Irrelevant in Rust, but explains odd comment style.)

## Tooling notes for an agent working in this repo

- Bun, not Node (system node is v14). `bun test`, `bun run check` (gate
  every commit on it), `bun start` (HTTPS dev server, port 8030).
- Never run `bun run build` while the dev server is up; never commit
  `docs/` or `dist/` outside a release.
- Commit by path; push freely; never rewrite history.
- Doc pages come from `/*# */` comments in source; each module documents
  itself. A doc states what is true now; history goes in commits and cards.
