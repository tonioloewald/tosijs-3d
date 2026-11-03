# Changelog

<!--{ "parent": "upgrading", "order": 20 }-->

All notable changes to **tosijs-3d**, one page per version: each lives in
`changelog/v<version>.md` (on the site at `/v<version>/`), and this page is the
index: the latest release below, then every version, newest first (that list is
generated from each page's `parent`). This project is pre-1.0 (`0.x`), so minor
versions may carry breaking peer-dependency changes. Each is called out in a
**⚠️ Breaking** block on its version's page, with what a consumer must do.
Upgrading across a minor? Start with [Migration](/Migration/).

## Unreleased

- **Scenes as agent tools** (`b3d-agent`): each `<tosi-b3d>` offers tools on WebMCP (`registerTool` only) and on `window.b3dAgent`: `b3d_<scene>_scene` and `_places` (named things and beacons, in world metres, with distance and bearing), `_snapshot`, `_control_go` (drives the vehicle in focus to a named place with its own controls; the player's input cancels it), `_control_hold`, `_control_status`, `_control_stop`, and the settings panel (`_panel`, `_panel_set`, `_panel_activate`). Closed by default: `enableSceneAgents({ expose: 'all' | 'read' })` opens the page, and a scene's new `agent` attribute (`read`, `on`, `off`) overrides it. `b3d.originOffset` is how far the floating origin has moved. Changing a scene's `agent` (or its name) after it is on the page updates its tools (#3699).
- **`bun run xr --flat --script`** now runs the script (it was ignored without VR), and a script that throws fails the run.
- **`semantics()` on every panel widget** (`tosijs-3d/widget-semantics`): a control says what it is (role, name, value) and can be set or pressed through its own path, as a hand would. `panel.controls()` reads a panel as a tree of named controls, including an open popup's form; `findControl` and `nameProblems` (unnamed or duplicate controls) work on it. `inputField` and `vector3d` take a `name`; `tabs3d` a `name`. This is the base the WebMCP tools and the screen-reader mirror are built on (#3699).
- **A screen reader can use the settings panel** (`tosijs-3d/aria-mirror`): an open flat panel is mirrored as visually hidden HTML controls (buttons, switches, range inputs, selects, text and number fields; sections as headings), which set or press the panel's own widgets. The system bar's HTML buttons now stay in the accessibility tree in scene mode (they were `visibility: hidden`) and appear while one has keyboard focus, so Tab goes from the owl into the settings. `ariaMirror(host, read)` mirrors any panel (#3699).
- **Every demo's settings panel passes the name test** (63 pages, about 1000 controls). The big editors describe themselves too: `curve3d` and `footprint3d` are editors whose value is their points and whose options are their presets (set either), and `curveProgram3d`, `lightEditor3d` and `terrainEditor3d` list their rows. A `list3d` item may carry a `title`, its accessible name when the label is not unique; an indented label is trimmed (#3699).
- **A keyboard and screen-reader pass over the panels** (`bun run screen-reader <page> --steps …`, a driver that reads only Chrome's accessibility tree and presses real keys). Fixes from it: the owl says whether its panel is open (`aria-expanded`); a slider announces its formatted value (`semantics().valueText`, `aria-valuetext`: "50 km", "±13 °C"); a log-scale slider is stepped along its track, not in equal steps of its value; focus stays in place when the control it was on is renamed (Pause becoming Resume); a toolbar with no name is "tools". `button3d` takes a `title` (its name and tooltip when the label is a glyph), and the name test now reports a control named only by a glyph such as `⋯` (#3699).
- **The 3D view for a screen reader**: the canvas is an image named "<title>, 3D scene", described in words (`describeScene`, `tosijs-3d/scene-description`: what you are in, which way you face, the time of day, the named things nearby with distance and direction). Built only when asked for: once when the scene appears, when the canvas takes focus, and by a visually hidden "Describe the scene" button that speaks it; never on a timer (#3699).
- **Assistive features cost nothing until used, and sit where things are drawn**: a scene builds no mirror, description or pad labels until focus first lands in it or one of its hidden buttons is pressed for real (iOS VoiceOver presses without focusing) (`b3d.assistive`), and runs no timer even then (values are re-read when a control takes focus). The mirrored controls are placed exactly over the drawn panel, modal and system bar (`ariaMirror`'s `place`; `ControlNode.box`, `WidgetSemantics.box` / `childBoxes`), so VoiceOver's touch exploration on a phone finds "Continue" where it is drawn and a double-tap lands on it (#3699).
- **Modals for a screen reader**: a modal (`showModal`: the pause, a respawn panel) is mirrored as a hidden dialog that takes focus on its first control (Continue) and gives focus back when it closes, so a pause can be dismissed with no pointer. It is always mirrored, not only once a scene is in use, because a modal blocks the page; its title ("Paused") is also announced. `ariaMirror` takes `role: 'dialog'`. Pressing a mirrored copy no longer counts as a press outside the settings panel (that closed the panel before the copy's click). The copy a reader has selected takes the pointer, because iOS VoiceOver presses with a touch at its centre, and while a modal is open the system bar's buttons and the panel's copies are inert, so a reader cannot open the settings from behind a pause (#3699).
- **The glass gamepad says where its controls are and what they do**: each control is named for a screen reader ("A button, bottom right: handbrake"), from the driven entity's new `inputLabels` (car, tank, aircraft and biped carry their mapping's labels), updated when you change what you control. The pad also stays hidden while the scene is loading.
- **Input trace in development**: with the debug sink on (the dev server), a scene posts each press it receives (touch, pointer, click, focus: real target, position, whether genuine) to the sink as `input`, so how a phone's screen reader presses things can be read rather than guessed (#3699).
- **Clouds drift on the sky's clock**: a cloud deck under a sky sped up with `realtimeScale` drifts and evolves that much faster, so a time-lapse carries its clouds; a stopped sky leaves them in real time (`skyRate(owner)`).

## 0.12.2

The latest release. More of the character, engine-free (eyes from Tonio's art, hair placement, lips and stubble as vertex colours, cloth recoloured into its texture, the extremes sweep), and the builder's save and rename ask in a popup. See [0.12.2](/v0.12.2/).

## Every version

<!-- toc -->
- [0.12.2](/v0.12.2/)
- [0.12.1](/v0.12.1/)
- [0.12.0](/v0.12.0/)
- [0.11.6](/v0.11.6/)
- [0.11.5](/v0.11.5/)
- [0.11.4](/v0.11.4/)
- [0.11.3](/v0.11.3/)
- [0.11.2](/v0.11.2/)
- [0.11.1](/v0.11.1/)
- [0.11.0](/v0.11.0/)
- [0.10.20](/v0.10.20/)
- [0.10.19](/v0.10.19/)
- [0.10.18](/v0.10.18/)
- [0.10.17](/v0.10.17/)
- [0.10.16](/v0.10.16/)
- [0.10.15](/v0.10.15/)
- [0.10.14](/v0.10.14/)
- [0.10.13](/v0.10.13/)
- [0.10.12](/v0.10.12/)
- [0.10.11](/v0.10.11/)
- [0.10.10](/v0.10.10/)
- [0.10.9](/v0.10.9/)
- [0.10.8](/v0.10.8/)
- [0.10.7](/v0.10.7/)
- [0.10.6](/v0.10.6/)
- [0.10.5](/v0.10.5/)
- [0.10.4](/v0.10.4/)
- [0.10.3](/v0.10.3/)
- [0.10.2](/v0.10.2/)
- [0.10.1](/v0.10.1/)
- [0.10.0](/v0.10.0/)
- [0.9.0](/v0.9.0/)
- [0.8.15](/v0.8.15/)
- [0.8.14](/v0.8.14/)
- [0.8.13](/v0.8.13/)
- [0.8.12](/v0.8.12/)
- [0.8.11](/v0.8.11/)
- [0.8.10](/v0.8.10/)
- [0.8.9](/v0.8.9/)
- [0.8.8](/v0.8.8/)
- [0.8.7](/v0.8.7/)
- [0.8.6](/v0.8.6/)
- [0.8.5](/v0.8.5/)
- [0.8.4](/v0.8.4/)
- [0.8.3](/v0.8.3/)
- [0.8.2](/v0.8.2/)
- [0.8.1](/v0.8.1/)
- [0.8.0](/v0.8.0/)
- [0.7.8](/v0.7.8/)
- [0.7.7](/v0.7.7/)
- [0.7.6](/v0.7.6/)
- [0.7.5](/v0.7.5/)
- [0.7.4](/v0.7.4/)
- [0.7.3](/v0.7.3/)
- [0.7.2](/v0.7.2/)
- [0.7.1](/v0.7.1/)
- [0.7.0](/v0.7.0/)
- [0.7.0-rc.1](/v0.7.0-rc.1/)
- [0.6.2](/v0.6.2/)
- [0.6.1](/v0.6.1/)
- [0.6.0](/v0.6.0/)
- [0.5.2](/v0.5.2/)
- [0.5.1](/v0.5.1/)
- [0.5.0](/v0.5.0/)
<!-- /toc -->
