/*#
# b3d-death

**Death needs an exit.** Without one, a crash is a dead end: the input manager stays welded
to the wreck, you go on "flying" a corpse, and the game is stuck. (`b3d-aircraft` used to
say as much on crash — _"Stays put until something resets it"_ — and nothing ever did.)

`<tosi-b3d-death>` is that exit. When the entity you're driving dies — flown into a hill, or
shot down — it:

1. **blows it up** and leaves **burning wreckage** where it happened;
2. **releases input focus** (you stop driving a corpse);
3. swings the camera into a **slow orbit around the wreck** — you watch the mistake you made;
4. after a beat, floats a **panel** with what to do next.

The panel is just widgets, so "what to do next" is entirely yours: `Respawn` is the default,
but a game can offer _Rewind_, _Spectate_, _Eject and walk_, _Quit to menu_ — whatever. It's
an in-scene SVG panel ([b3d-svg-plane](?b3d-svg-plane.ts)), so it works **flat and in VR**
with the same coordinate-based picking, and needs no DOM overlay.

## What it deliberately does NOT do

**It doesn't respawn you.** It calls the `respawn` callback you give it, because only the
game knows what a fresh life means: a new entity at a spawn point, a saved checkpoint, a
different aircraft. Death is a *systemic* fact; what happens next is a *game* decision, and
this component refuses to guess.

Prefer respawning as a **genuinely new entity** rather than teleport-and-reset. A death that
is secretly a reset is a lie the narrative layer would have to un-learn — the simulation
should really emit a death and really emit a spawn, because that's the stream a driver reads
(see `world-contract.ts`).

## Demo

```js
import { b3d, b3dAircraft, b3dDeath, b3dGround, b3dLight, b3dSkybox, gameController, inputFocus } from 'tosijs-3d'

// Fly it into the ground. Watch it burn. Press Respawn.
const scene = b3d(
  { gamepad: true },
  b3dLight({ y: 1, intensity: 0.9 }),
  b3dSkybox({ timeOfDay: 9 }),
  b3dGround({ width: 400, height: 400, color: '#6b7f5e' }),
  b3dDeath({
    title: 'DOWN',
    respawn() {
      // A fresh aircraft — not a reset of the dead one.
      const plane = b3dAircraft({ library: 'vehicles', meshName: 'scout', player: true, y: 60 })
      scene.appendChild(plane)
    },
  }),
  inputFocus(
    gameController(),
    b3dAircraft({ library: 'vehicles', meshName: 'scout', player: true, y: 60 }),
  ),
)
preview.append(scene)
```
```css
tosi-b3d { width: 100%; height: 100%; }
```

## Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `title` | `'DOWN'` | Heading on the panel |
| `delay` | `1.4` | Seconds between the bang and the panel (let the player watch it burn) |
| `orbitRadius` | `14` | Camera distance from the wreck |
| `orbitHeight` | `6` | Camera height above the wreck |
| `orbitSpeed` | `6` | Degrees/sec — slow. This is a moment, not a ride |
| `wreckage` | `'on'` | Explode + leave burning wreckage (`'off'` = just the panel) |
| `blastRadius` | `6` | Size of the fireball |

## Callbacks

| Prop | Description |
|------|-------------|
| `respawn` | What "Respawn" does. Without it, the button isn't offered |
| `choices` | `() => Widget3d[]` — replace the whole panel body (Respawn, Spectate, Quit …) |

> **Never name these `onFoo`** — `elementCreator()` binds any `on*` prop as a DOM event
> listener, so `onRespawn` would silently become `addEventListener('respawn')` and never
> fire. (See CLAUDE.md.)
*/
/*{ "parent": "World Sim" }*/
import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils';
import { explosionFx } from './b3d-warhead';
import { panel3d, label3d, button3d } from './widgets3d';
import { b3dSvgPlane } from './b3d-svg-plane';
const DEG = Math.PI / 180;
export class B3dDeath extends B3dChild {
    static initAttributes = {
        title: 'DOWN',
        delay: 1.4,
        orbitRadius: 14,
        orbitHeight: 6,
        orbitSpeed: 6,
        wreckage: 'on',
        blastRadius: 6,
    };
    /** What "Respawn" does. No callback ⇒ no Respawn button (the game may not allow one). */
    respawn = null;
    /** Replace the panel body entirely: Rewind, Spectate, Eject, Quit — whatever the game has. */
    choices = null;
    /** True from the bang until the player picks something. */
    get dying() {
        return this._dying;
    }
    _dying = false;
    _orbitCam = null;
    _prevCam = null;
    _panel = null;
    _fires = [];
    _obs = null;
    _timer = null;
    _onDeath = (e) => this._handleDeath(e);
    sceneReady(owner) {
        // Both ways a pilot dies: flown into terrain (`crash`) and shot down (`destroyed`).
        // Both bubble, so listen once on the scene rather than chasing entities around.
        owner.addEventListener('crash', this._onDeath);
        owner.addEventListener('destroyed', this._onDeath);
    }
    sceneDispose() {
        const owner = this.owner;
        if (owner) {
            owner.removeEventListener('crash', this._onDeath);
            owner.removeEventListener('destroyed', this._onDeath);
        }
        this._cleanup();
    }
    get focusManager() {
        return (this.owner?.querySelector('tosi-b3d-input-focus') ??
            null);
    }
    _handleDeath(e) {
        if (this._dying)
            return;
        const focus = this.focusManager;
        const driven = focus?.focused ?? null;
        // Only OUR death matters. A cube exploding across the map is not a game-over.
        if (driven == null || !e.target?.contains?.(driven)) {
            if (e.target !== driven)
                return;
        }
        this.die(driven);
    }
    /** Kill the run. Public so a game can trigger a death that isn't a crash or a hit. */
    die(entity) {
        if (this._dying || this.owner == null)
            return;
        this._dying = true;
        const scene = this.owner.scene;
        const mesh = entity?.mesh ?? null;
        const at = mesh
            ? mesh.absolutePosition.clone()
            : scene.activeCamera?.globalPosition.clone() ?? BABYLON.Vector3.Zero();
        // 1. The bang, and something that goes on burning while you look at it.
        if (this.wreckage !== 'off') {
            explosionFx(scene, at, this.blastRadius);
            this._burn(scene, mesh, at);
        }
        // 2. Stop driving the corpse. THE bug this component exists to fix.
        this.focusManager?.releaseFocus();
        // 3. Orbit the mistake you made.
        this._prevCam = scene.activeCamera;
        const cam = new BABYLON.ArcRotateCamera('death-orbit', -Math.PI / 2, Math.PI / 2.6, this.orbitRadius, at.add(new BABYLON.Vector3(0, this.orbitHeight * 0.35, 0)), scene);
        cam.lowerRadiusLimit = cam.upperRadiusLimit = this.orbitRadius;
        this._orbitCam = cam;
        this.owner.setActiveCamera(cam);
        // Slow. This is a moment, not a ride.
        this._obs = scene.onBeforeRenderObservable.add(() => {
            cam.alpha +=
                this.orbitSpeed * DEG * (scene.getEngine().getDeltaTime() / 1000);
        });
        // 4. A beat to watch it burn, THEN the panel. Offering a menu over a fireball reads
        //    as a bug report rather than a death.
        this._timer = setTimeout(() => this._showPanel(), this.delay * 1000);
    }
    _burn(scene, mesh, at) {
        const fire = new BABYLON.ParticleSystem('wreck-fire', 220, scene);
        fire.particleTexture = null;
        fire.emitter = at.clone();
        fire.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
        fire.maxEmitBox = new BABYLON.Vector3(1, 0.5, 1);
        fire.color1 = new BABYLON.Color4(1, 0.6, 0.1, 1);
        fire.color2 = new BABYLON.Color4(1, 0.2, 0, 1);
        fire.colorDead = new BABYLON.Color4(0.2, 0.1, 0.1, 0);
        fire.minSize = 0.6;
        fire.maxSize = 2.2;
        fire.minLifeTime = 0.3;
        fire.maxLifeTime = 0.9;
        fire.emitRate = 90;
        fire.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        fire.direction1 = new BABYLON.Vector3(-0.4, 3, -0.4);
        fire.direction2 = new BABYLON.Vector3(0.4, 5, 0.4);
        fire.gravity = new BABYLON.Vector3(0, 1.5, 0);
        fire.start();
        const smoke = new BABYLON.ParticleSystem('wreck-smoke', 160, scene);
        smoke.particleTexture = null;
        smoke.emitter = at.clone();
        smoke.minEmitBox = new BABYLON.Vector3(-0.8, 0.5, -0.8);
        smoke.maxEmitBox = new BABYLON.Vector3(0.8, 1, 0.8);
        smoke.color1 = new BABYLON.Color4(0.25, 0.25, 0.25, 0.7);
        smoke.color2 = new BABYLON.Color4(0.1, 0.1, 0.1, 0.5);
        smoke.colorDead = new BABYLON.Color4(0.05, 0.05, 0.05, 0);
        smoke.minSize = 1.5;
        smoke.maxSize = 5;
        smoke.minLifeTime = 1.4;
        smoke.maxLifeTime = 3;
        smoke.emitRate = 35;
        smoke.direction1 = new BABYLON.Vector3(-0.6, 2, -0.6);
        smoke.direction2 = new BABYLON.Vector3(0.6, 3.5, 0.6);
        smoke.gravity = new BABYLON.Vector3(0, 0.6, 0);
        smoke.start();
        this._fires.push(fire, smoke);
        // Char the airframe, and stop it casting the crisp shadow of a healthy aeroplane.
        if (mesh) {
            for (const m of mesh.getChildMeshes(false).concat(mesh)) {
                const mat = m.material;
                if (mat && 'albedoColor' in mat) {
                    mat.albedoColor = new BABYLON.Color3(0.12, 0.1, 0.1);
                }
            }
        }
    }
    _showPanel() {
        if (!this._dying || this.owner == null)
            return;
        const rows = this.choices
            ? this.choices()
            : [
                label3d({ text: this.title, bold: true }),
                ...(this.respawn
                    ? [
                        button3d({
                            label: 'Respawn',
                            onClick: () => this.resume(() => this.respawn?.()),
                        }),
                    ]
                    : [label3d({ text: 'no way back', muted: true })]),
            ];
        const svg = panel3d({ width: 320, height: 46 + rows.length * 48 }, ...rows);
        // In-scene, camera-relative: ONE panel that works flat AND in VR, with the same
        // coordinate-based picking. A DOM overlay would simply not exist in a headset.
        const plane = b3dSvgPlane({
            cameraRelative: true,
            width: 1.1,
            height: 1.1 * ((46 + rows.length * 48) / 320),
            z: 2.2,
            y: 0,
            resolution: 512,
            pointerEvents: 'on',
        });
        // Hand it the widget panel BEFORE it mounts, so its first render has content.
        plane.svgElement = svg;
        this._panel = plane;
        this.owner.appendChild(plane);
    }
    /** Tear down the death state and hand control back — then run `next` (e.g. respawn). */
    resume(next) {
        this._cleanup();
        this._dying = false;
        next?.();
    }
    _cleanup() {
        if (this._timer != null)
            clearTimeout(this._timer);
        this._timer = null;
        const scene = this.owner?.scene;
        if (scene && this._obs)
            scene.onBeforeRenderObservable.remove(this._obs);
        this._obs = null;
        for (const p of this._fires)
            p.dispose();
        this._fires = [];
        this._panel?.remove();
        this._panel = null;
        if (this._orbitCam) {
            // Restore whatever was looking before, so a respawn's own camera setup takes over
            // from a sane place rather than from a dead orbit.
            if (this._prevCam && this.owner)
                this.owner.setActiveCamera(this._prevCam);
            this._orbitCam.dispose();
            this._orbitCam = null;
        }
        this._prevCam = null;
    }
}
export const b3dDeath = B3dDeath.elementCreator({
    tag: 'tosi-b3d-death',
});
//# sourceMappingURL=b3d-death.js.map