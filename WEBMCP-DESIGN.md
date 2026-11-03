# WEBMCP-DESIGN — scenes, panels and the controller as agent tools

> Status: **accepted, being built** (#3699). Steps 1 to 7 are done (bipeds'
> go-to is not; the mirror still wants a pass with a real screen reader); the
> doc page remains. Written 2026-11-02 after a survey
> of tosijs 1.10.10's agent layer and of what tosijs-3d has; Tonio's answers
> are under Decisions at the end.

**The goal.** An agent with only the page's WebMCP tools can read a demo's
scene, change its settings panel, and drive the car in City Drive to a named
place. Every adopter's game gets that by declaring its scene, panels and
controllables the way it already does: nothing bespoke.

**The same work is accessibility.** A panel control an agent can find by name,
read and set is a control a screen reader can. A controller that takes "drive
to the harbour" is how someone plays who cannot work two thumbsticks; switch
access and voice use the same seam as an agent. So each family below is
designed once and serves the agent, the screen reader, haltija (#2546) and our
own tests.

## What tosijs gives us, and what it does not

tosijs's agent layer (`tosijs/agent`) describes BOUND STATE and DOM:
`enableAgentInterface({ expose, webmcp })` builds a surface, and
`webmcpTools()` turns its `describe()` into tools (`tosi_describe`,
`tosi_read`, `tosi_changes`, `tosi_act_<path>`, `tosi_write`), registered by
`webmcpAdapter` on `document.modelContext` (or the deprecated
`navigator.modelContext`). Exposure is `closed` by default, `manifest`
(declared roots and actions) or `all`.

A b3d page is a canvas to it. A scene's contents, vehicles and camera are in
Babylon; the SVG panels act on pointer COORDINATES, not DOM events. So we need
our own tools, and tosijs has **no API for a library to add tools to its set**.
The choices are to append to `webmcpTools()` and register the lot ourselves
(with `webmcp: false` on tosijs), or register separately. Two tosijs gaps
matter (both on its board, untouched):

- **#1674**: under the `provideContext` fallback (a host with no
  `registerTool`) every caller REPLACES the page's whole tool set, and
  tosijs's unregister blanks tools it never registered. Two registrants on one
  page clobber each other.
- **#1696**: `describe()` has no budget, and a host may call it every turn.

**Plan:** ask tosijs for one page-level tool registry that libraries add to
(`registerAgentTools(prefix, tools)` or tools in `enableAgentInterface`), so
there is one registrant per page. Until it exists, we register with
`registerTool` ONLY and decline the `provideContext` fallback (say so in the
console), so we never blank anyone's tools.

## The registry: per scene, zero cost until asked

- Each `<tosi-b3d>` contributes tools under a prefix, `b3d_<scene>_…`, where
  `<scene>` is its `name` (or `id`, else its index). `b3d_scenes` lists the
  page's scenes, which one has input focus, and what each offers.
- Every tool computes on CALL. Nothing runs per frame, nothing is observed,
  until an agent asks; the controller's provider is attached only when a
  control tool is called, and detached when its command ends.
- The same tools are on `window.b3dAgent` (as `tosiAgent` is), so haltija,
  headless checks and the emulated headset call them with no WebMCP host.

## Family 1: panels (the core of it)

`Widget3d` today knows how to draw and how to take a pointer, but not WHAT it
is. Add one optional method:

```ts
semantics?(): {
  role: 'button' | 'toggle' | 'slider' | 'select' | 'text' | 'colour' | 'list' | 'tabs' | 'label' | …
  name: string             // the accessible name: label, tooltip, or <title>
  value?: unknown          // what it shows now
  options?: string[]; min?: number; max?: number; step?: number
  disabled?: boolean
  set?(value: unknown): void   // through the widget's own setter, as a press would
  activate?(): void
}
```

Each widget family implements it once (button, toggle, slider, select, input
field, colour picker, list, tabs, icon bar, label and text read-only). A
panel's controls are then a tree of named controls, built by walking the
widget list the panel already has (`_panelWidgets` for the settings panel;
any `panel3d`, `box` or system bar). Collapsible sections are levels of it.

That tree serves four readers:

- **Agent tools**: `b3d_<scene>_panel` (the tree: names, roles, values),
  `…_panel_set { control, value }`, `…_panel_activate { control }`. Controls
  are addressed by path of names (`Character/save…`); a duplicate name is an
  error the tool reports, not a guess.
- **A screen reader**: a hidden DOM mirror of the tree as real ARIA controls
  (as the system bar already mirrors real HTML buttons), kept in step when
  the panel rebuilds. Flat only to begin with.
- **A test**: every interactive widget on every demo's panel has a non-empty,
  unique name. That is "icons first, but never nameless" enforced.
- **Popups**: a popup is a surface too, so its controls appear while it is
  open (the save popup's field and buttons).

Setting goes through the widget's own path (the bound value, `handleChange`,
`handleCommit`) so a value an agent sets is indistinguishable from one a
hand set, and the one-UI-two-presentations rule holds.

## Family 2: the scene

- `…_scene`: what is in it. Each scene child that has a `name` (or an `id`):
  its kind (tag), position in scene metres, heading, and whether it is the
  controllable in focus; the camera's pose; time of day, daylight and the
  weather here (`weatherHere`). Floating origin accounted for (positions are
  reported in the scene's frame and say so).
- `…_snapshot`: the image (`snapshot()`, a PNG), which a model can look at.
- `…_places`: NAMED PLACES, for "go to". A place is anything named with a
  position: a `<tosi-b3d-beacon name>` or a named entity. (A component could
  later name its own places, a city its junctions; not in this card.)

**Overlap with the world-sim contract.** `MinSimApi` is already the
coordinate-free vocabulary for this (places, portals, proximity rungs,
`steer`). Read answers carry a proximity rung ("near", "far") beside the
metres, from `world-topology`'s `proximityRung`, and "go to" takes the place
by name. Later, a live scene can implement `MinSimApi` and the scene tools
become a thin layer over it, so an Ariosto driver and an agent use one
surface. The contract's rules hold: the tools are narrative-blind, intents are
advisory (the player's own input still wins), and only commitments are events.

## Family 3: the controller

An `AgentInputProvider` that a controllable's `CompositeInputProvider` merges
like any other source, so the agent drives the way a player does and never
writes positions.

- `…_control_hold { input, seconds }`: a `ControlInput` (forward, turn,
  throttle, …) held for a time. The raw form.
- `…_control_go { place | x,z, speed? }`: an INTENT. A per-kind steering rule
  turns it into input each frame (a ground vehicle aims its heading at the
  target and eases off as it nears; a biped walks), using the pure models'
  own reach (no pathfinding at first: a straight line, reporting when it is
  stuck).
- `…_control_status`: what the provider is doing, distance left, arrived or
  stuck. `…_control_stop`.
- Any real input from the player cancels the agent's command. The provider
  acts only on the scene's focused controllable, and takes the scene's input
  focus while it runs.

## Exposure

Proposed: a scene's tools follow **tosijs's posture**: none while the page's
agent surface is `closed` (the default), read tools under `manifest`, and
set / control tools only where writes are allowed. `<tosi-b3d agent="on|off">`
overrides per scene. So an adopter who has turned the agent surface on gets
the 3D tools with no extra step; one who has not, gets nothing.

## Steps

1. **Upstream**: file the shared-registry ask on tosijs (with #1674's
   clobbering as the reason).
2. **`semantics()`** on every widget, the panel tree, and the name test over
   every demo's panel. Fix what it finds (likely: icon buttons without names).
3. **The registry**, `window.b3dAgent`, and the panel tools. Check: a headless
   page sets a slider and presses a button on a demo's panel through them.
4. **Scene tools** and named places (beacons, entities).
5. **The controller**: hold, then go-to for ground vehicles, then bipeds.
6. **Done-when**: a headless test opens City Drive and, with only the tools,
   reads the scene, sets the panel's time of day to night and drives to a
   named place (a beacon the demo puts down). `bun run agent-check`.
7. **The ARIA mirror** for flat panels, with a screen-reader pass.
8. A doc page ("Agents and accessibility") and the attribute on `<tosi-b3d>`.

## Decisions (Tonio, 2026-11-02)

1. **Posture: follow tosijs's.** Safe by default (`closed`: no tools), and
   easy to expose everything. Tonio: "I think this is the right posture."
2. **Ship now with `registerTool` only**, and move to tosijs's registry when
   it lands. The shared-registry ask is filed on tosijs.
3. **The ARIA mirror is in this card** (step 7).
4. **No city-specific place names in this card.** The question was what a
   driver says "go to" with in City Drive; the answer is the general one, a
   named beacon or entity. A city naming its own streets can come later.
5. **Dramatis**: asked on the board what it wants; it can be added later.
