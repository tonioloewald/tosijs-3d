# b3d-death

**Death needs an exit.** Without one, a crash is a dead end: the input manager stays welded
to the wreck, you go on "flying" a corpse, and the game is stuck.

`<tosi-b3d-death>` is that exit. When the entity you're driving dies — flown into a hill, or
shot down — it:

1. **blows it up** and leaves **burning wreckage** where it happened;
2. **releases input focus** (you stop driving a corpse);
3. swings the camera into a **slow orbit around the wreck** — you watch the mistake you made;
4. after a beat, floats a **panel** with what to do next.

The panel is just widgets, so "what to do next" is entirely yours: `Respawn` is the default,
but a game can offer _Rewind_, _Spectate_, _Eject and walk_, _Quit to menu_ — whatever. It's
an in-scene SVG panel, so it works **flat and in VR** with the same coordinate-based
picking, and needs no DOM overlay. It is the scene's modal (the pause's too), drawn over
everything so terrain cannot bury it: flat in the middle of the screen, in a headset in
front of you.

## Demo

**Fly it into the ground.** (W/S pitch, A/D bank, R/Q throttle.) Watch it burn, then press
Respawn on the floating panel.

```js
import { b3d, b3dAircraft, b3dDeath, b3dLibrary, b3dGround, b3dLight, b3dSun, b3dSkybox, inputFocus } from 'tosijs-3d'

const plane = () => b3dAircraft({
  library: 'vehicles', meshName: 'scout',
  player: true, y: 80, vtolSpeed: 6, maxSpeed: 50,
})

// A respawned aircraft is appended INSIDE the focus manager — it then announces itself
// (adoptIfVacant) once it's ready, and the manager takes it because it's driving nobody.
const focus = inputFocus(plane())

const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.5 }),
  b3dSun({ intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 9 }),
  b3dGround({ meshName: 'ground_nocast', width: 600, height: 600, color: '#6b7f5e' }),
  b3dLibrary({ url: '/test-3.glb', type: 'vehicles' }),
  b3dDeath({
    title: 'DOWN',
    respawn() {
      // A fresh aircraft — NOT a reset of the dead one. The sim really emits a death and
      // really emits a spawn, which is the stream a narrative driver reads.
      //
      // No need to tell the focus manager: a controllable ANNOUNCES itself when it's ready
      // (adoptIfVacant), and the manager takes it because it's driving nobody. Asking the
      // manager to re-scan here would find `player` still false — attributes aren't drained
      // until connectedCallback.
      focus.appendChild(plane())
    },
  }),
  focus,
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## What it deliberately does NOT do

**It doesn't respawn you.** It calls the `respawn` callback you give it, because only the
game knows what a fresh life means: a new entity at a spawn point, a saved checkpoint, a
different aircraft. Death is a *systemic* fact; what happens next is a *game* decision, and
this component refuses to guess.

Prefer respawning as a **genuinely new entity** rather than teleport-and-reset. A death that
is secretly a reset is a lie the narrative layer would have to un-learn — the simulation
should really emit a death and really emit a spawn, because that's the stream a driver reads
(see [world-contract](/world-contract/)).

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `title` | `'DOWN'` | Heading on the panel |
| `delay` | `1.4` | Seconds between the bang and the panel (let the player watch it burn) |
| `orbitRadius` | `14` | Camera distance from the wreck |
| `orbitHeight` | `6` | Camera height above the wreck |
| `orbitSpeed` | `6` | Degrees/sec — slow. This is a moment, not a ride |
| `spectate` | `'orbit'` | `orbit` circles the wreck; `chase` freezes the third-person shot you died in (static). Flat only |
| `wreckage` | `'on'` | Explode + leave burning wreckage (`'off'` = just the panel) |
| `blastRadius` | `6` | Size of the fireball |

## Callbacks

| Prop | Description |
|------|-------------|
| `respawn` | What "Respawn" does. Without it, the button isn't offered |
| `choices` | `() => Widget3d[]` — replace the whole panel body (Respawn, Spectate, Quit …) |

> **Never name these `onFoo`** — `elementCreator()` binds any `on*` prop as a DOM event
> listener, so `onRespawn` would silently become `addEventListener('respawn')` and never
> fire.

## How wreckage falls

A dead aircraft does not hang where it died, which would leave a solid object in the
sky for the next pilot to hit. It tumbles to the ground, slams in, skids and stops.
The model is pure and deterministic:

- **The spin is derived, never random.** The axis comes from the velocity (a craft
  tumbles end over end across its flight path) and the rate from speed. A fast crash
  windmills, a stall drops flat, and the same crash looks the same twice, which
  matters when you are tuning a scenario.
- **It bounces once, badly.** A small hop and a decaying skid, so it settles quickly
  rather than skating away.
- **It stops for good.** Below a threshold it is grounded and stays there.

The scene raycasts for the ground and hands the model a height, so a floating-origin
rebase is absorbed for free.
