import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'
import {
  _resetSceneAgents,
  callSceneTool,
  enableSceneAgents,
  panelTools,
  registerAgentScene,
  sceneAgentTools,
  sceneTools,
  syncAgents,
  toolSafe,
  type AgentExposure,
  type AgentSceneHost,
} from './b3d-agent.js'
import { controlTree, type ControlNode } from './widget-semantics.js'

let W: typeof import('./widgets3d.js')

beforeAll(async () => {
  const win = new Window() as any
  const g = globalThis as any
  g.window ??= win
  for (const k of Object.getOwnPropertyNames(win)) {
    try {
      g[k] ??= win[k]
    } catch {
      /* off-document getters */
    }
  }
  W = await import('./widgets3d.js')
})

afterEach(() => _resetSceneAgents())

/** A scene with a settings panel, as `<tosi-b3d>` gives the registry. */
function fakeScene(name: string, agent: AgentExposure | '' = '') {
  const state = { time: 6, night: false, resets: 0 }
  let rows: ReturnType<typeof build> | null = null
  function build() {
    return [
      W.label3d({ text: 'Sky', collapsible: true, open: true }),
      W.slider3d({
        label: 'time of day',
        value: state.time,
        min: 0,
        max: 24,
        handleChange: (v) => (state.time = v),
      }),
      W.toggle3d({
        label: 'night',
        value: state.night,
        handleChange: (v) => (state.night = v),
      }),
      W.button3d({ label: 'reset', handleClick: () => state.resets++ }),
    ]
  }
  const host: AgentSceneHost & {
    agentControls(fresh?: boolean): ControlNode[]
    agentPanelOpen(): boolean
  } = {
    agentName: () => name,
    agentExposure: () => agent,
    agentTools: () => panelTools(host),
    agentPanelOpen: () => false,
    agentControls: (fresh = true) => {
      if (fresh || rows == null) rows = build()
      for (const w of rows) w.layout?.(300)
      return controlTree(rows)
    },
  }
  return { host, state }
}

describe('exposure', () => {
  test('closed by default: no tools, no global', () => {
    registerAgentScene(fakeScene('City Drive').host)
    syncAgents()
    expect(sceneAgentTools()).toEqual([])
    expect((globalThis as any).b3dAgent).toBeUndefined()
  })

  test('the page opens every scene; read leaves out the writes', () => {
    registerAgentScene(fakeScene('City Drive').host)
    enableSceneAgents({ expose: 'read', webmcp: false })
    expect(sceneAgentTools().map((t) => t.name)).toEqual([
      'b3d_scenes',
      'b3d_city_drive_panel',
    ])
    enableSceneAgents({ expose: 'all', webmcp: false })
    expect(sceneAgentTools().map((t) => t.name)).toEqual([
      'b3d_scenes',
      'b3d_city_drive_panel',
      'b3d_city_drive_panel_set',
      'b3d_city_drive_panel_activate',
    ])
    expect((globalThis as any).b3dAgent).toBeDefined()
  })

  test("a scene's own setting wins over the page's", () => {
    registerAgentScene(fakeScene('a', 'off').host)
    registerAgentScene(fakeScene('b', 'read').host)
    enableSceneAgents({ expose: 'all', webmcp: false })
    expect(sceneAgentTools().map((t) => t.name)).toEqual([
      'b3d_scenes',
      'b3d_b_panel',
    ])
  })

  test('two scenes with one name are numbered; a nameless one is counted', () => {
    registerAgentScene(fakeScene('demo').host)
    registerAgentScene(fakeScene('demo').host)
    registerAgentScene(fakeScene('').host)
    enableSceneAgents({ expose: 'read', webmcp: false })
    expect(
      sceneAgentTools()
        .map((t) => t.name)
        .filter((n) => n.endsWith('_panel'))
    ).toEqual(['b3d_demo_panel', 'b3d_demo_2_panel', 'b3d_scene3_panel'])
    expect(toolSafe('  Land & Sky! ')).toBe('land_sky')
  })
})

describe('the panel tools', () => {
  test("read, set and press through each control's own path", async () => {
    const { host, state } = fakeScene('city drive')
    registerAgentScene(host)
    enableSceneAgents({ webmcp: false })

    const panel = (await callSceneTool('b3d_city_drive_panel')) as any
    expect(panel.open).toBe(false)
    expect(panel.controls[0].children.map((c: any) => c.path)).toEqual([
      'Sky/time of day',
      'Sky/night',
      'Sky/reset',
    ])

    expect(
      await callSceneTool('b3d_city_drive_panel_set', {
        control: 'Sky/time of day',
        value: 21,
      })
    ).toEqual({ control: 'Sky/time of day', value: 21 })
    expect(state.time).toBe(21)

    await callSceneTool('b3d_city_drive_panel_set', {
      control: 'night',
      value: true,
    })
    expect(state.night).toBe(true)

    expect(
      await callSceneTool('b3d_city_drive_panel_activate', { control: 'reset' })
    ).toEqual({ control: 'Sky/reset' })
    expect(state.resets).toBe(1)
  })

  test('refusals say why', async () => {
    registerAgentScene(fakeScene('s').host)
    enableSceneAgents({ webmcp: false })
    const set = (input: Record<string, unknown>) =>
      callSceneTool('b3d_s_panel_set', input) as Promise<any>
    expect((await set({ control: 'reset', value: 1 })).error).toMatch(
      /cannot be set \(activate it instead\)/
    )
    expect((await set({ control: 'fog', value: 1 })).error).toMatch(
      /no control "fog". Controls: Sky, Sky\/time of day/
    )
    expect((await callSceneTool('b3d_nope')) as any).toMatchObject({
      error: expect.stringMatching(/no tool "b3d_nope". Tools: b3d_scenes/),
    })
  })
})

describe('WebMCP', () => {
  test('registered with registerTool, withdrawn when closed again', async () => {
    const tools = new Map<string, any>()
    ;(globalThis as any).document.modelContext = {
      registerTool: (t: any) => {
        tools.set(t.name, t)
        return { unregister: () => tools.delete(t.name) }
      },
    }
    try {
      const { host, state } = fakeScene('x')
      registerAgentScene(host)
      enableSceneAgents({ expose: 'all' })
      expect([...tools.keys()]).toContain('b3d_x_panel_set')
      await tools.get('b3d_x_panel_set').execute({ control: 'night', value: 1 })
      expect(state.night).toBe(true)
      enableSceneAgents({ expose: 'none' })
      expect(tools.size).toBe(0)
    } finally {
      delete (globalThis as any).document.modelContext
    }
  })

  test('a host with only provideContext is declined, never called', () => {
    let provided = 0
    ;(globalThis as any).document.modelContext = {
      provideContext: () => provided++,
    }
    try {
      registerAgentScene(fakeScene('x').host)
      enableSceneAgents({ expose: 'all' })
      expect(provided).toBe(0)
      expect((globalThis as any).b3dAgent).toBeDefined()
    } finally {
      delete (globalThis as any).document.modelContext
    }
  })
})

describe('the scene tools', () => {
  const posed = (x: number, z: number, fx = 0, fz = 1) => ({
    getAbsolutePosition: () => ({ x, y: 0, z }),
    forward: { x: fx, y: 0, z: fz },
  })
  function sceneHost() {
    const root = document.createElement('div')
    const add = (
      tag: string,
      attrs: Record<string, string>,
      mesh?: unknown
    ) => {
      const el = document.createElement(tag) as any
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      if (mesh) el.mesh = mesh
      root.appendChild(el)
      return el
    }
    const car = add('tosi-b3d-car', { id: 'car' }, posed(0, 0))
    add('tosi-b3d-beacon', { name: 'harbour' }, posed(10, 10))
    add('tosi-b3d-beacon', { name: 'gate' }, posed(-3, 0))
    add('tosi-b3d-biped', {}, posed(1, 1)) // unnamed: not listed
    add('tosi-b3d-skybox', { id: 'sky' }) // no mesh: not listed
    const focus = add('tosi-b3d-input-focus', {})
    Object.defineProperty(focus, 'focused', { value: car })
    const host = {
      querySelector: (s: string) => root.querySelector(s),
      querySelectorAll: (s: string) => root.querySelectorAll(s),
      originOffset: { x: 100, z: 0 },
      scene: { activeCamera: null },
    }
    return host
  }

  test('named things, nearest first, in world metres, with bearing', () => {
    const tools = sceneTools(sceneHost())
    const places = tools.find((t) => t.name === 'places')!.execute({}) as any[]
    expect(places.map((p) => p.name)).toEqual(['gate', 'harbour'])
    expect(places[0]).toMatchObject({
      kind: 'beacon',
      at: [97, 0, 0],
      distance: 3,
      near: 'obvious',
      bearing: -90,
    })
    expect(places[1].bearing).toBe(45)
    expect(places[1].near).toBe('noticeable')
    const scene = tools.find((t) => t.name === 'scene')!.execute({}) as any
    expect(scene.you).toMatchObject({ name: 'car', kind: 'car', focused: true })
    expect(scene.entities.map((e: any) => e.name)).toEqual([
      'car',
      'gate',
      'harbour',
    ])
  })
})
