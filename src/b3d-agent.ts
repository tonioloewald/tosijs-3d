/*#
# agents

**A scene an agent can use.** Each `<tosi-b3d>` offers tools under its own
prefix, `b3d_<scene>_…`: its settings panel as named controls an agent reads,
sets and presses through each control's own path, exactly as a hand would.
Nothing runs until a tool is called, and nothing is offered until the page
says so: closed by default, as tosijs's agent surface is.

```javascript
import { enableSceneAgents } from 'tosijs-3d'
enableSceneAgents({ expose: 'all' })   // every scene: read, set and press

// or per scene: <tosi-b3d agent="read"> (read only) / agent="on" / agent="off"

const a = window.b3dAgent
a.tools().map((t) => t.name)
// ['b3d_scenes', 'b3d_city_drive_panel', 'b3d_city_drive_panel_set', …]
await a.call('b3d_city_drive_panel_set', { control: 'Sky/time of day', value: 21 })
```

Where the browser offers WebMCP (`document.modelContext.registerTool`), the
same tools are registered there, so a browser's assistant sees them. A host
that only has `provideContext` is declined with a console note: that call
replaces the page's whole tool set, which would blank every other script's.

## The tools

| tool | what it does |
| --- | --- |
| `b3d_scenes` | the page's scenes: name, which has input focus, what each offers |
| `b3d_<scene>_scene` | you (the controllable in focus), the camera, time of day, daylight, the weather here, and every named thing: kind, position, heading, distance, a proximity word, bearing |
| `b3d_<scene>_places` | named places to go to, nearest first: named beacons and named things |
| `b3d_<scene>_snapshot` | `{ width? }`: a PNG of what the camera sees |
| `b3d_<scene>_control_go` | `{ place }` or `{ x, z }`, `speed?`, `wait?`: drive the vehicle in focus there with its own controls; it reports `arrived`, or `stuck` when it stops making progress |
| `b3d_<scene>_control_hold` | `{ input, seconds }`: hold controls (`forward`, `turn`, `jump`…) for a time |
| `b3d_<scene>_control_status` / `_control_stop` | what the command is doing (`wait` to wait for it), or end it |
| `b3d_<scene>_panel` | the settings panel as a tree of named controls (role, name, path, value, options, range) and any name problems |
| `b3d_<scene>_panel_set` | `{ control, value }`: set a control by its path (`Sky/time of day`) |
| `b3d_<scene>_panel_activate` | `{ control }`: press a button, open a section, pick a list item |

A NAMED thing is any scene element with an `id` (or a `name`, as a
`<tosi-b3d-beacon name="harbour">` has) and a mesh. Positions are world metres,
y up, with the floating origin's moves added back, so a place keeps its
coordinates when the scene rebases. Headings are degrees, 0 facing +z and 90
facing +x; a bearing is the turn from where you face (negative is left).
Distances come with world-topology's proximity rung (`reach`, `obvious`,
`noticeable`, `present`), the words the world-sim contract uses.

The controls are driven the way a player drives: the
[agent driver](/agent-driver/) turns a command into `ControlInput` each frame,
in place of the player's, so the car keeps its grip, walls and traffic. The
player's own deliberate input cancels the command at once. `go` drives a
straight line (no route finding yet) and ground vehicles only, so far.

A control is addressed by its path of names; see
[widget semantics](/widget-semantics/). A path that names nothing, or more
than one control, is refused with the list of what is there.

When the panel is open the tools read the panel on screen (its folded
sections and any popup open from it); when it is closed they read the
panel's rows unfolded, so nothing has to be opened first.

## Exposure

| page (`enableSceneAgents`) / scene (`agent`) | tools |
| --- | --- |
| nothing said (default) | none |
| `'read'` | `b3d_scenes` and the read tools |
| `'all'` / `"on"` | everything |
| `agent="off"` | none for that scene, whatever the page says |

A scene's own `agent` attribute wins over the page's setting.
*/
/*{ "parent": "core", "order": 60 }*/

import { proximityRung } from './world-topology.js'
import {
  AgentDriver,
  bearingDeg,
  headingDeg,
  type DriverPose,
} from './agent-driver.js'
import {
  findControl,
  plainControls,
  nameProblems,
  walkControls,
  type ControlNode,
} from './widget-semantics.js'

/** What a scene lets an agent do: nothing, read, or read and act. */
export type AgentExposure = 'off' | 'read' | 'on'

/** One tool, in WebMCP's shape, plus whether it changes anything. */
export interface B3dAgentTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  /** Changes the world (set, press, drive): offered only at `on`. */
  write?: boolean
  execute: (input: Record<string, unknown>) => unknown
}

/** What a scene gives the registry (a `<tosi-b3d>`). */
export interface AgentSceneHost {
  /** Its name in tool names; made safe by the registry. */
  agentName(): string
  /** Its own setting: '' follows the page. */
  agentExposure(): AgentExposure | ''
  /** The tools it offers, unprefixed (`panel`, `panel_set`, …). */
  agentTools(): B3dAgentTool[]
  readonly hasInputFocus?: boolean
  readonly isConnected?: boolean
}

/** What the panel tools need from a scene. */
export interface PanelAgentHost {
  /** The settings panel as named controls. `fresh` false reuses the last build. */
  agentControls(fresh?: boolean): ControlNode[]
  /** Is the panel on screen? */
  agentPanelOpen(): boolean
}

// ---- the scene -------------------------------------------------------------

/** What the scene tools read from a scene (a `<tosi-b3d>`), duck-typed. */
export interface SceneAgentHost {
  querySelector(selector: string): Element | null
  querySelectorAll(selector: string): ArrayLike<Element>
  readonly scene?: { activeCamera?: unknown } | null
  /** How far the floating origin has moved (world = scene + offset). */
  readonly originOffset?: { x: number; z: number }
  weatherHere?(): unknown
  snapshot?(opts?: { width?: number; height?: number }): Promise<string>
  /** Make this the scene the shared controls drive. */
  takeInputFocus?(): void
}

type Vec = { x: number; y: number; z: number }
type Posed = {
  getAbsolutePosition?: () => Vec
  globalPosition?: Vec
  position?: Vec
  forward?: Vec
  getForwardRay?: (length?: number) => { direction: Vec }
}

/** One named thing in a scene, as the scene tools report it. */
export interface AgentEntity {
  name: string
  /** Its element's tag without `tosi-b3d-`: `car`, `biped`, `beacon`… */
  kind: string
  /** World metres, y up: the same place whatever the floating origin did. */
  at: [number, number, number]
  /** Degrees: 0 faces +z, 90 faces +x. */
  heading?: number
  focused?: boolean
  /** Metres from you (the focused controllable, else the camera). */
  distance?: number
  /** The distance as a word (world-topology's proximity rungs). */
  near?: string
  /** Degrees from where you face to it: negative is left, positive right. */
  bearing?: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Round every number in a plain value to centimetres, for a short answer. */
function rounded(v: unknown): unknown {
  if (typeof v === 'number') return r2(v)
  if (Array.isArray(v)) return v.map(rounded)
  if (v != null && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) {
      if (typeof x !== 'function') out[k] = rounded(x)
    }
    return out
  }
  return v
}

function positionOf(node: Posed | null | undefined): Vec | null {
  if (node == null) return null
  return (
    node.getAbsolutePosition?.() ?? node.globalPosition ?? node.position ?? null
  )
}

const nameOf = (el: Element): string => {
  const e = el as Element & { name?: unknown }
  return (
    el.id ||
    (typeof e.name === 'string' ? e.name : '') ||
    el.getAttribute('name') ||
    ''
  )
}

/** The named things in a scene, nearest first. */
export function sceneEntities(host: SceneAgentHost): {
  you: AgentEntity | null
  camera: { at: [number, number, number]; heading?: number } | null
  entities: AgentEntity[]
} {
  const off = host.originOffset ?? { x: 0, z: 0 }
  const world = (p: Vec): [number, number, number] => [
    r2(p.x + off.x),
    r2(p.y),
    r2(p.z + off.z),
  ]
  const focusedEl = (
    host.querySelector('tosi-b3d-input-focus') as { focused?: unknown } | null
  )?.focused as Element | null | undefined
  const cam = host.scene?.activeCamera as Posed | null | undefined
  const camPos = positionOf(cam)
  const camFwd = cam?.getForwardRay?.(1)?.direction ?? null
  const camera = camPos
    ? {
        at: world(camPos),
        ...(camFwd ? { heading: r2(headingDeg(camFwd)) } : {}),
      }
    : null

  const read = (el: Element): AgentEntity | null => {
    const mesh = (el as { mesh?: Posed }).mesh
    const p = positionOf(mesh)
    if (p == null) return null
    const fwd = mesh?.forward
    return {
      name: nameOf(el),
      kind: el.tagName.toLowerCase().replace(/^tosi-b3d-/, ''),
      at: world(p),
      ...(fwd ? { heading: r2(headingDeg(fwd)) } : {}),
      ...(el === focusedEl ? { focused: true } : {}),
    }
  }
  const you = focusedEl ? read(focusedEl) : null
  const origin = you
    ? { x: you.at[0], y: you.at[1], z: you.at[2], heading: you.heading }
    : camera
    ? {
        x: camera.at[0],
        y: camera.at[1],
        z: camera.at[2],
        heading: camera.heading,
      }
    : null
  const entities: AgentEntity[] = []
  for (const el of Array.from(host.querySelectorAll('*'))) {
    if (!el.tagName.toLowerCase().startsWith('tosi-b3d-')) continue
    if (nameOf(el) === '') continue
    const e = read(el)
    if (e == null) continue
    if (origin != null) {
      const at = { x: e.at[0], y: e.at[1], z: e.at[2] }
      const d = Math.hypot(at.x - origin.x, at.y - origin.y, at.z - origin.z)
      e.distance = r2(d)
      e.near = proximityRung(d)
      if (origin.heading !== undefined && el !== focusedEl)
        e.bearing = r2(bearingDeg(origin, origin.heading, at))
    }
    entities.push(e)
    if (entities.length >= 200) break
  }
  entities.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  return { you, camera, entities }
}

/** The scene's own tools: what is in it, its picture, its named places. */
export function sceneTools(host: SceneAgentHost): B3dAgentTool[] {
  return [
    {
      name: 'scene',
      description:
        'What is in the scene: you (the controllable in focus) and the camera, the time of day and daylight, the weather where the camera is, and every named thing with its kind, position (world metres, y up), heading (degrees, 0 faces +z, 90 faces +x), distance from you and bearing (degrees to turn: negative left).',
      inputSchema: { type: 'object', properties: {} },
      execute: () => {
        const { you, camera, entities } = sceneEntities(host)
        const sky = host.querySelector('tosi-b3d-skybox') as {
          timeOfDay?: number
          daylight?: number
        } | null
        return rounded({
          you,
          camera,
          ...(sky
            ? { time: { timeOfDay: sky.timeOfDay, daylight: sky.daylight } }
            : {}),
          ...(host.weatherHere ? { weather: host.weatherHere() } : {}),
          entities,
        })
      },
    },
    {
      name: 'places',
      description:
        'Named places to go to, nearest first: named beacons and named things (not you), with distance, a proximity word and bearing (degrees to turn: negative left).',
      inputSchema: { type: 'object', properties: {} },
      execute: () =>
        sceneEntities(host)
          .entities.filter((e) => !e.focused)
          .map(({ name, kind, distance, near, bearing, at }) => ({
            name,
            kind,
            distance,
            near,
            bearing,
            at,
          })),
    },
    {
      name: 'snapshot',
      description:
        'A picture of what the camera sees now, as a PNG data URL (the system bar and any panel open in the scene included).',
      inputSchema: {
        type: 'object',
        properties: {
          width: { type: 'number', description: 'Pixels across (default 512)' },
        },
      },
      execute: async (input) => {
        if (host.snapshot == null)
          return { error: 'this scene cannot snapshot' }
        const width =
          typeof input.width === 'number' && input.width > 16
            ? Math.min(2048, Math.round(input.width))
            : 512
        const canvas = (
          host as {
            engine?: { getRenderingCanvas?: () => HTMLCanvasElement | null }
          }
        ).engine?.getRenderingCanvas?.()
        const aspect =
          canvas && canvas.width > 0 ? canvas.height / canvas.width : 9 / 16
        const height = Math.round(width * aspect)
        return { image: await host.snapshot({ width, height }), width, height }
      },
    },
  ]
}

// ---- the controller ---------------------------------------------------------

/** What the control tools drive: the controllable in focus. */
interface Drivable extends Element {
  agentDriver: AgentDriver | null
  agentPose(): DriverPose | null
  speed?: number
}

function drivable(host: SceneAgentHost): Drivable | { error: string } {
  const f = (
    host.querySelector('tosi-b3d-input-focus') as { focused?: unknown } | null
  )?.focused as Partial<Drivable> | null | undefined
  if (f == null || typeof f.agentPose !== 'function')
    return { error: 'nothing in this scene is under control (no input focus)' }
  return f as Drivable
}

const waitFor = async (d: AgentDriver, seconds: number): Promise<void> => {
  // Real time: an agent waits as a person would, paused world or not.
  let left = Math.min(120, Math.max(0, seconds)) * 1000
  while (d.running && left > 0) {
    await new Promise((r) => setTimeout(r, 100))
    left -= 100
  }
}

const waitInput = {
  wait: {
    type: 'number',
    description:
      'Seconds to wait for it to finish before answering (default 0: answer at once; at most 120)',
  },
}

/** Drive the controllable in focus with its own controls: hold, go, status, stop. */
export function controlTools(host: SceneAgentHost): B3dAgentTool[] {
  const start = (
    run: (d: AgentDriver, who: Drivable) => { error: string } | void
  ) => {
    const who = drivable(host)
    if ('error' in who) return who
    const d = (who.agentDriver ??= new AgentDriver())
    const refused = run(d, who)
    if (refused) return refused
    host.takeInputFocus?.()
    return { who: who.id || who.tagName.toLowerCase(), d }
  }
  const answer = async (
    r: ReturnType<typeof start>,
    wait: unknown
  ): Promise<unknown> => {
    if ('error' in r) return r
    if (typeof wait === 'number' && wait > 0) await waitFor(r.d, wait)
    return { driving: r.who, ...r.d.status }
  }
  return [
    {
      name: 'control_hold',
      description:
        "Hold controls on the thing in focus for a time, as a player would: forward (-1..1: on a vehicle, throttle; negative brakes then reverses), turn (-1..1, + right), jump (a vehicle's handbrake), lookX, lookY, sprint, shoot… The player's own input cancels it.",
      write: true,
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'object',
            description:
              'Control names and values, e.g. { "forward": 1, "turn": -0.3 }',
          },
          seconds: { type: 'number', description: 'How long (world time)' },
          ...waitInput,
        },
        required: ['input', 'seconds'],
      },
      execute: (input) => {
        const raw = input.input as Record<string, unknown> | undefined
        const held: Record<string, number> = {}
        for (const [k, v] of Object.entries(raw ?? {}))
          if (typeof v === 'number' && Number.isFinite(v))
            held[k] = Math.max(-1, Math.min(1, v))
        const seconds = Number(input.seconds)
        return answer(
          start((d) => {
            if (!(seconds > 0)) return { error: 'seconds: a time above 0' }
            d.holdInput(held, seconds)
          }),
          input.wait
        )
      },
    },
    {
      name: 'control_go',
      description:
        "Drive the vehicle in focus to a named place (see places) or a point (x, z in world metres): it steers with its own controls in a straight line and stops there, reporting arrived, or stuck if something is in the way. The player's own input cancels it. Ground vehicles only, so far.",
      write: true,
      inputSchema: {
        type: 'object',
        properties: {
          place: { type: 'string', description: 'A name from places' },
          x: { type: 'number' },
          z: { type: 'number' },
          speed: { type: 'number', description: 'Top speed, m/s (default 10)' },
          arrive: {
            type: 'number',
            description: 'Close enough, metres (default 4)',
          },
          ...waitInput,
        },
      },
      execute: (input) => {
        let target: { x: number; z: number } | null = null
        let place: string | undefined
        if (typeof input.place === 'string' && input.place !== '') {
          const want = input.place.toLowerCase()
          const all = sceneEntities(host).entities.filter((e) => !e.focused)
          const hits = all.filter((e) => e.name.toLowerCase() === want)
          if (hits.length !== 1)
            return {
              error:
                hits.length > 1
                  ? `"${input.place}" names ${hits.length} places`
                  : `no place "${input.place}". Places: ${
                      all.map((e) => e.name).join(', ') || 'none'
                    }`,
            }
          target = { x: hits[0].at[0], z: hits[0].at[2] }
          place = hits[0].name
        } else if (typeof input.x === 'number' && typeof input.z === 'number')
          target = { x: input.x, z: input.z }
        if (target == null) return { error: 'go: a place, or x and z' }
        const to = target
        return answer(
          start((d, who) => {
            if (typeof who.speed !== 'number')
              return {
                error: `go drives ground vehicles so far; ${who.tagName.toLowerCase()} can take control_hold`,
              }
            d.go(to, {
              place,
              ...(typeof input.speed === 'number'
                ? { speed: input.speed }
                : {}),
              ...(typeof input.arrive === 'number'
                ? { arrive: input.arrive }
                : {}),
            })
          }),
          input.wait
        )
      },
    },
    {
      name: 'control_status',
      description:
        "What the agent's command is doing: running, arrived, done, stuck or cancelled (with why), distance left and time taken. With wait, waits for it to finish first.",
      inputSchema: { type: 'object', properties: { ...waitInput } },
      execute: async (input) => {
        const who = drivable(host)
        if ('error' in who) return who
        const d = who.agentDriver
        if (d == null) return { state: 'idle' }
        if (typeof input.wait === 'number') await waitFor(d, input.wait)
        return { driving: who.id || who.tagName.toLowerCase(), ...d.status }
      },
    },
    {
      name: 'control_stop',
      description:
        "Stop the agent's command; the controls go back to the player.",
      write: true,
      inputSchema: { type: 'object', properties: {} },
      execute: () => {
        const who = drivable(host)
        if ('error' in who) return who
        who.agentDriver?.stop('stopped by the agent')
        return who.agentDriver?.status ?? { state: 'idle' }
      },
    },
  ]
}

const controlInput = {
  type: 'object',
  properties: {
    control: {
      type: 'string',
      description:
        'The control\'s path of names, e.g. "Sky/time of day", or its own name when that is unique',
    },
  },
  required: ['control'],
}

/** The settings-panel tools for one scene. */
export function panelTools(host: PanelAgentHost): B3dAgentTool[] {
  const reread = (path: string): ControlNode | null => {
    const r = findControl(host.agentControls(false), path)
    return 'node' in r ? r.node : null
  }
  const found = (control: unknown) => {
    if (typeof control !== 'string' || control === '')
      return { error: 'control: a path of names is required' }
    return findControl(host.agentControls(), control)
  }
  return [
    {
      name: 'panel',
      description:
        "The scene's settings panel as a tree of named controls: role, name, path (what the other panel tools take), value, options, range, and whether it can be set or pressed. Closed sections list no rows while the panel is open; activate one to open it.",
      inputSchema: {
        type: 'object',
        properties: {
          depth: {
            type: 'number',
            description: 'How many levels to list (default all)',
          },
        },
      },
      execute: (input) => {
        const tree = host.agentControls()
        const depth =
          typeof input.depth === 'number' && input.depth > 0
            ? input.depth
            : Infinity
        const problems = nameProblems(tree)
        return {
          open: host.agentPanelOpen(),
          controls: plainControls(tree, depth),
          ...(problems.length > 0 ? { problems } : {}),
        }
      },
    },
    {
      name: 'panel_set',
      description:
        'Set a control on the settings panel (a slider, toggle, select, text field, colour…) through its own path, as a hand would. Returns the value it now shows.',
      write: true,
      inputSchema: {
        type: 'object',
        properties: {
          ...controlInput.properties,
          value: {
            description:
              "The new value: a number for a slider, true/false for a toggle, an option's label for a select, text for a field",
          },
        },
        required: ['control', 'value'],
      },
      execute: (input) => {
        const r = found(input.control)
        if ('error' in r) return r
        const n = r.node
        if (n.set == null)
          return {
            error: `"${n.path}" is a ${n.role}; it cannot be set${
              n.activate ? ' (activate it instead)' : ''
            }`,
          }
        if (n.disabled) return { error: `"${n.path}" is disabled` }
        n.set(input.value)
        const after = reread(n.path)
        return { control: n.path, value: after?.value ?? n.value }
      },
    },
    {
      name: 'panel_activate',
      description:
        'Press a control on the settings panel: a button, a menu item, a section header (opens or closes it), a list item. Returns any popup it opened, as controls.',
      write: true,
      inputSchema: controlInput,
      execute: (input) => {
        const r = found(input.control)
        if ('error' in r) return r
        const n = r.node
        if (n.activate == null)
          return {
            error: `"${n.path}" is a ${n.role}; it cannot be pressed${
              n.set ? ' (set it instead)' : ''
            }`,
          }
        if (n.disabled) return { error: `"${n.path}" is disabled` }
        n.activate()
        const tree = host.agentControls(false)
        const popup = walkControls(tree).find(
          (c) => c.role === 'popup' && c.path === n.path
        )
        const after = reread(n.path)
        return {
          control: n.path,
          ...(after?.open !== undefined ? { open: after.open } : {}),
          ...(popup ? { popup: plainControls(popup.children ?? []) } : {}),
        }
      },
    },
  ]
}

// ---- the page's registry -------------------------------------------------

const scenes = new Set<AgentSceneHost>()
let pageExposure: AgentExposure = 'off'
let useWebmcp = true

/** A name safe in a tool name: lower case, letters, digits and `_`. */
export function toolSafe(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** What a scene exposes: its own setting, else the page's. */
export function exposureOf(own: AgentExposure | '', page: AgentExposure) {
  return own === '' ? page : own
}

const allows = (exposure: AgentExposure, tool: B3dAgentTool) =>
  exposure === 'on' || (exposure === 'read' && !tool.write)

function live(): AgentSceneHost[] {
  return [...scenes].filter((s) => s.isConnected !== false)
}

/** Each scene's prefix: its safe name, numbered when two share it. */
function prefixes(): Map<AgentSceneHost, string> {
  const out = new Map<AgentSceneHost, string>()
  const used = new Map<string, number>()
  live().forEach((s, i) => {
    let base = toolSafe(s.agentName()) || `scene${i + 1}`
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    if (n > 0) base = `${base}_${n + 1}`
    out.set(s, base)
  })
  return out
}

function scenesTool(): B3dAgentTool {
  return {
    name: 'b3d_scenes',
    description:
      "The 3D scenes on this page: each one's name (its tools are b3d_<name>_…), whether it has input focus, and the tools it offers.",
    inputSchema: { type: 'object', properties: {} },
    execute: () =>
      [...prefixes()].map(([s, name]) => {
        const ex = exposureOf(s.agentExposure(), pageExposure)
        return {
          name,
          focused: !!s.hasInputFocus,
          exposure: ex,
          tools: s
            .agentTools()
            .filter((t) => allows(ex, t))
            .map((t) => `b3d_${name}_${t.name}`),
        }
      }),
  }
}

/** Every tool the page offers now, prefixed, under each scene's exposure. */
export function sceneAgentTools(): B3dAgentTool[] {
  const out: B3dAgentTool[] = []
  for (const [s, name] of prefixes()) {
    const ex = exposureOf(s.agentExposure(), pageExposure)
    if (ex === 'off') continue
    for (const t of s.agentTools())
      if (allows(ex, t)) out.push({ ...t, name: `b3d_${name}_${t.name}` })
  }
  return out.length > 0 ? [scenesTool(), ...out] : []
}

/** Call a tool by name; refuses one the page does not offer. */
export async function callSceneTool(
  name: string,
  input: Record<string, unknown> = {}
): Promise<unknown> {
  const tool = sceneAgentTools().find((t) => t.name === name)
  if (tool == null) {
    const names = sceneAgentTools().map((t) => t.name)
    return {
      error: `no tool "${name}"${
        names.length > 0
          ? `. Tools: ${names.join(', ')}`
          : ': no scene on this page is exposed to agents'
      }`,
    }
  }
  return await tool.execute(input ?? {})
}

/** `window.b3dAgent`: the same tools with no WebMCP host. */
export interface B3dAgentGlobal {
  tools(): Array<{
    name: string
    description: string
    inputSchema: Record<string, unknown>
  }>
  call(name: string, input?: Record<string, unknown>): Promise<unknown>
  /** Re-register with the browser after scenes change name or exposure. */
  sync(): void
}

const agentGlobal: B3dAgentGlobal = {
  tools: () =>
    sceneAgentTools().map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  call: callSceneTool,
  sync: () => syncAgents(),
}

/**
 * Open every scene on the page to agents: `expose: 'all'` (read, set, press,
 * drive), `'read'`, or `'none'` (the default). A scene's own `agent`
 * attribute wins. `webmcp: false` keeps the tools off the browser's registry
 * (they stay on `window.b3dAgent`).
 */
export function enableSceneAgents(
  options: { expose?: 'all' | 'read' | 'none'; webmcp?: boolean } = {}
): B3dAgentGlobal {
  const e = options.expose ?? 'all'
  pageExposure = e === 'all' ? 'on' : e === 'read' ? 'read' : 'off'
  if (options.webmcp !== undefined) useWebmcp = options.webmcp
  syncAgents()
  return agentGlobal
}

/** A scene joins (on connect) or leaves (on teardown) the page's registry. */
export function registerAgentScene(s: AgentSceneHost): () => void {
  scenes.add(s)
  queueSync()
  return () => {
    scenes.delete(s)
    queueSync()
  }
}

let syncQueued = false
function queueSync(): void {
  if (syncQueued) return
  syncQueued = true
  queueMicrotask(() => {
    syncQueued = false
    syncAgents()
  })
}

// ---- WebMCP --------------------------------------------------------------

type Registered = { name: string; withdraw: () => void }
let registered: Registered[] = []
let declinedNoted = false

/** The tool, late-bound: a call reaches whatever the page offers now. */
function lateBound(name: string, t: B3dAgentTool) {
  return {
    name,
    description: t.description,
    inputSchema: t.inputSchema,
    execute: (input: Record<string, unknown>) =>
      callSceneTool(name, input ?? {}),
  }
}

/** Install `window.b3dAgent` and bring the browser's registry into line. */
export function syncAgents(): void {
  const tools = sceneAgentTools()
  const g = globalThis as { b3dAgent?: B3dAgentGlobal }
  if (tools.length > 0) g.b3dAgent = agentGlobal
  else if (g.b3dAgent === agentGlobal) delete g.b3dAgent

  const want = useWebmcp ? tools : []
  const host = modelContext()
  if (host == null) return
  if (typeof host.registerTool !== 'function') {
    if (want.length > 0 && !declinedNoted) {
      declinedNoted = true
      console.info(
        "tosijs-3d agents: this browser offers only provideContext, which replaces the page's whole tool set; the scene tools are on window.b3dAgent instead."
      )
    }
    return
  }
  const names = new Set(want.map((t) => t.name))
  for (const r of registered.filter((r) => !names.has(r.name))) r.withdraw()
  registered = registered.filter((r) => names.has(r.name))
  const have = new Set(registered.map((r) => r.name))
  for (const t of want) {
    if (have.has(t.name)) continue
    try {
      const ac =
        typeof AbortController === 'function' ? new AbortController() : null
      const handle = ac
        ? host.registerTool(lateBound(t.name, t), { signal: ac.signal })
        : host.registerTool(lateBound(t.name, t))
      const withdraw =
        handle != null && typeof handle.unregister === 'function'
          ? () => handle.unregister()
          : typeof host.unregisterTool === 'function'
          ? () => host.unregisterTool(t.name)
          : () => ac?.abort()
      registered.push({ name: t.name, withdraw })
    } catch (err) {
      console.warn(`tosijs-3d agents: the host refused "${t.name}"`, err)
    }
  }
}

function modelContext(): any {
  const g = globalThis as any
  return g.document?.modelContext ?? g.navigator?.modelContext ?? null
}

/** Testing only: forget every scene, the page's exposure and registrations. */
export function _resetSceneAgents(): void {
  for (const r of registered) r.withdraw()
  registered = []
  scenes.clear()
  pageExposure = 'off'
  useWebmcp = true
  declinedNoted = false
  delete (globalThis as { b3dAgent?: unknown }).b3dAgent
}
