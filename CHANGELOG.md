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

- **Vehicles you can drive.** `ground-vehicle` is a pure model of wheeled and tracked vehicles (springs, tyre grip that slides past its limit, Ackermann steering, skid steer), no physics engine. `<tosi-b3d-car>` is rebuilt on it: give it a model whose wheels have `wheel` in their names (Tonio Loewald's cars on the CDN, `tonio/vehicles/cars.glb`, work at `scale: 2`; so does Kenney's Car Kit at `1.7`), and it measures them. ⚠️ `b3d-car`'s `turnRate` and `friction` are gone: use `steerDeg`, `grip`, `mass` and `drive`; `acceleration` and `braking` are now m/s². `<tosi-b3d-tank>` is new: tracks, a pivot turn, and a plain tank when given no model. The car mapping is GTA V's: right trigger accelerates, left trigger brakes and reverses, the left stick only steers, the right stick looks around, A or the right bumper is the handbrake (W/S still drive on a keyboard, through the new `keyboard` hook on an `InputMapping`). Vehicles bring their own chase camera, high and aimed ahead of the car (`chaseRigFor`, `chasePose`). Off the throttle a car coasts down (`coast`, m/s²); steering at speed is held to what the tyres grip, so turns keep their speed. A tank keeps turning at top speed and goes where it points. The tank's right stick (arrow keys) aims its turret: traverse and gun elevation, held in the world while the hull turns, and the camera looks where it aims; a model's `turret` and `gun`/`barrel`/`cannon` nodes are found by name. A tank climbs a step about as high as its tracks (a `TrackSpec` may carry `climb` points, which carry nothing on the flat). Vehicles stop at walls with rays from their own body instead of a swept ellipsoid, which stepped over anything under half its height.

- **A city's plan**: `cityLayout({ width, depth, seed })` lays out roads, blocks and lots on a grid of cells (every road connected, every lot on a street), with each road cell's piece and rotation; it knows no kit or metres, so any kit on any grid can dress it.

- **A city to drive in**: `<tosi-b3d-city>` builds roads, buildings, street lights and parked cars from a seed with Kenney's city kits (any kit, through its `kit` manifest), drawn as thin instances. **Lamps** (`lightPool`): street lights and headlights are virtual lights, and the nearest few get real lights (`lampLights`, a new device budget). The sky reports `daylight`, so street lights come on at dusk and a driven vehicle's `headlights` at night.

## 0.11.6

The latest release. The character leaves the builder: any body (MakeHuman's, Blender's, Quaternius' or your own mesh) rigged, dressed and tailored the same way; a character file that carries its body; `makeCharacter`, and `<tosi-b3d-biped character>` to walk it in a game; a material picker. [Read 0.11.6](/v0.11.6/).

## Every version

<!-- toc -->
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
