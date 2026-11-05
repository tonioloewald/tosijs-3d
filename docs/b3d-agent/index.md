# agents

**A scene an agent can use.** Each `<tosi-b3d>` offers tools under its own
prefix, `b3d_<scene>_…`: its settings panel as named controls an agent reads,
sets and presses through each control's own path, exactly as a hand would.
Nothing runs until a tool is called, and nothing is offered until the page
says so: closed by default, as tosijs's agent surface is.

## Demo

```js
import { b3d, b3dSkybox, b3dSun, b3dGround, b3dBox, b3dBeacon, slider3d } from 'tosijs-3d'
import { orbitCam } from 'tosijs-3d/demo-utils'
import { elements } from 'tosijs'

const { div, button, pre } = elements
const sky = b3dSkybox({ timeOfDay: 10, realtimeScale: 0 })
const sceneEl = b3d(
  {
    id: 'harbour-demo',
    agent: 'on',
    panelTitle: 'Harbour',
    style: 'width:100%;height:100%',
    scenePanel: () => [
      slider3d({ label: 'time of day', value: sky.timeOfDay, min: 0, max: 24,
        handleChange: (v) => (sky.timeOfDay = v) }),
    ],
    sceneCreated(el) {
      orbitCam(el, { alphaDeg: -70, betaDeg: 60, radius: 30, target: [0, 0, 0] })
    },
  },
  sky,
  b3dSun(),
  b3dGround({ size: 60, color: '#4a5a46' }),
  b3dBox({ id: 'crate', x: 4, y: 0.5, z: 2, color: '#b07840' }),
  b3dBeacon({ name: 'harbour', follow: 'off', x: 18, y: 1, z: 12 }),
  b3dBeacon({ name: 'gate', follow: 'off', x: -10, y: 1, z: -4 })
)

const out = pre({ class: 'readout' }, 'press a tool')
const tool = (label, name, input) =>
  button({
    onClick: async () => {
      const answer = await window.b3dAgent.call(`b3d_harbour_demo_${name}`, input)
      out.textContent = `${name} ${input ? JSON.stringify(input) : ''}\n` +
        JSON.stringify(answer, null, 1).slice(0, 1200)
    },
  }, label)

preview.append(
  sceneEl,
  div({ class: 'tools' },
    tool('places', 'places'),
    tool('panel', 'panel'),
    tool('make it night', 'panel_set', { control: 'time of day', value: 22 }),
    tool('make it day', 'panel_set', { control: 'time of day', value: 10 })),
  out
)
```
```css
.preview { display: flex; flex-direction: column; height: 100%; }
tosi-b3d { flex: 1; min-height: 0; width: 100%; }
.tools { display: flex; gap: 6px; padding: 6px 0; flex-wrap: wrap; }
.readout {
  margin: 0;
  max-height: 30%;
  overflow: auto;
  padding: 4px 10px;
  font-size: 12px;
  color: #fff;
  background: #0009;
}
```

The buttons are what an agent does: each calls one of the scene's tools on
`window.b3dAgent` and shows the answer. `places` lists the two beacons and the
crate with where they are from the camera; `make it night` sets the panel's
slider through its own path, so the sky follows and the open panel shows it.
The scene opted itself in with `agent: 'on'`; nothing else on the page is
offered.

## Using it

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

## The same names serve a screen reader

An agent and a screen reader need the same thing from a panel: every control
named, with a role and a value, and a way to set it that is not a pointer
coordinate. So they share it. The panel tree the tools read is also drawn as
real, visually hidden HTML controls for a screen reader (the
[aria mirror](/aria-mirror/)), on by default for every flat settings panel and
not affected by `agent`. And `nameProblems` (the name test) reports a control
with no name, or two with one path, which breaks both at once: icons first,
but never nameless.
