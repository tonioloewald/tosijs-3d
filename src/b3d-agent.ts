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
| `b3d_<scene>_panel` | the settings panel as a tree of named controls (role, name, path, value, options, range) and any name problems |
| `b3d_<scene>_panel_set` | `{ control, value }`: set a control by its path (`Sky/time of day`) |
| `b3d_<scene>_panel_activate` | `{ control }`: press a button, open a section, pick a list item |

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
