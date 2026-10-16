/*#
# dials

**A compass and a watch you can glance at, flat or in a headset.** The compass
needle points north as you turn. The watch is the time of day and how fast it
passes: drag the dot round the ring to set the hour (noon at the top, midnight
at the bottom), and drag the dot along the bar from the snail (time stands
still) to the rabbit (an hour a second).

Both are drawn by an artist, not by code: the SVGs are Tonio's, the code only
finds the parts by name and moves them. Put either on the system bar with a
`<tosi-b3d-panel icon title>`, as here, and it works flat and in a headset.

## Demo

```js
import { b3d, b3dSun, b3dSkybox, b3dGround, b3dLight, b3dPanel } from 'tosijs-3d'
// Not in the barrel (the artwork is 36 KB): import the subpath.
import { skyWatch, sceneCompass } from 'tosijs-3d/dials'

const skybox = b3dSkybox({ timeOfDay: 9, realtimeScale: 0 })
const scene = b3d(
  {},
  b3dLight({ intensity: 0.4 }),
  b3dSun({}),
  skybox,
  b3dGround({ size: 200, texture: 'checker' }),
  b3dPanel({ title: 'Time', icon: 'clock' }, skyWatch(skybox)),
)
scene.append(b3dPanel({ title: 'Compass', icon: 'compass' }, sceneCompass(scene)))
preview.append(scene)
```

## The parts the code drives

Redraw freely; keep these ids (and the 256 × 256 view box, centred on 128, 128).

| art | id | what the code does |
| --- | --- | --- |
| compass | `Magnet` | turned about the centre so it points north |
| compass | `Rose` | turned instead, with `mode: 'card'` |
| watch | `time_of_day_indicator` | turned about the centre: noon at the top |
| watch | `speed_indicator` | moved along the bar, x 80 (slow) to 176 (fast) |

`bun run dial-art` copies `static/compass.svg` and `static/vr-watch.svg` into
`src/dial-art.ts`, so the library never fetches them.

## API

| function | returns |
| --- | --- |
| `compassDial({ size, mode })` | an `<svg>` with a `heading` property (degrees, clockwise from north, which is +Z) |
| `watchDial({ time, speed, handleTime, handleSpeed, size })` | an `<svg>` with `time` (hours) and `speed` (0…1) properties and `handlePointer` |
| `sceneCompass(b3d)` | a compass that follows the scene's active camera |
| `skyWatch(skybox)` | a watch bound to a skybox's `timeOfDay` and `realtimeScale` |
| `watchSpeedToScale(t)` / `scaleToWatchSpeed(s)` | the speed bar's position to `realtimeScale` and back: 0 is still, then real time to an hour a second on a log scale |
*/
/*{ "parent": "ui", "order": 60 }*/
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { compassSvg, watchSvg } from './dial-art.js';
const CX = 128;
const CY = 128;
/** The speed bar: where the dot's centre runs, in the art's units. */
const SPEED_X0 = 80;
const SPEED_X1 = 176;
const SPEED_Y = 152;
function parseArt(markup, size) {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const svg = document.importNode(doc.documentElement, true);
    svg.setAttribute('viewBox', '0 0 256 256');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.removeAttribute('x');
    svg.removeAttribute('y');
    return svg;
}
/** A part by id, within this one drawing (two dials can share ids). */
function part(svg, id) {
    return svg.querySelector(`[id="${id}"]`);
}
/**
 * A compass. `mode: 'needle'` (the default) turns the needle over a fixed
 * rose, so the captions stay upright and N means "ahead"; `'card'` turns the
 * rose and needle together, as a ship's compass card does.
 */
export function compassDial(config = {}) {
    const svg = parseArt(compassSvg, config.size ?? 256);
    const turned = config.mode === 'card'
        ? [part(svg, 'Rose'), part(svg, 'Magnet')]
        : [part(svg, 'Magnet')];
    let heading = 0;
    Object.defineProperty(svg, 'heading', {
        get: () => heading,
        set: (h) => {
            heading = ((h % 360) + 360) % 360;
            // North sits `heading` degrees anticlockwise of ahead.
            for (const el of turned)
                el?.setAttribute('transform', `rotate(${-heading} ${CX} ${CY})`);
        },
    });
    svg.heading = 0;
    return svg;
}
/** The speed bar's position (0…1) to a skybox `realtimeScale`. */
export function watchSpeedToScale(t) {
    if (!(t >= 0.02))
        return 0;
    return Math.pow(3600, Math.min(1, (t - 0.02) / 0.98));
}
/** A skybox `realtimeScale` to the speed bar's position (0…1). */
export function scaleToWatchSpeed(scale) {
    if (!(scale >= 1))
        return 0;
    return 0.02 + 0.98 * Math.min(1, Math.log(scale) / Math.log(3600));
}
/**
 * A watch: the time of day on the ring and how fast it passes on the bar.
 * Dragging either dot calls `handleTime(hours)` / `handleSpeed(t)`; setting
 * `time` or `speed` moves the dot without calling them.
 */
export function watchDial(config = {}) {
    const svg = parseArt(watchSvg, config.size ?? 256);
    const timeDot = part(svg, 'time_of_day_indicator');
    const speedDot = part(svg, 'speed_indicator');
    let time = 12;
    let speed = 1;
    Object.defineProperty(svg, 'time', {
        get: () => time,
        set: (h) => {
            time = ((h % 24) + 24) % 24;
            // Noon at the top, clockwise: 15 degrees an hour.
            timeDot?.setAttribute('transform', `rotate(${(time - 12) * 15} ${CX} ${CY})`);
        },
    });
    Object.defineProperty(svg, 'speed', {
        get: () => speed,
        set: (t) => {
            speed = Math.max(0, Math.min(1, t));
            // The art has the dot at the fast end.
            const x = SPEED_X0 + (SPEED_X1 - SPEED_X0) * speed;
            speedDot?.setAttribute('transform', `translate(${x - SPEED_X1} 0)`);
        },
    });
    svg.time = config.time ?? 12;
    svg.speed = config.speed ?? 1;
    /*
    A DRAG STAYS WITH WHAT IT GRABBED: a press on the bar moves the speed
    until release even if the pointer wanders onto the ring, and the other
    way round.
    */
    let dragging = null;
    const timeAt = (x, y) => {
        const a = (Math.atan2(x - CX, -(y - CY)) * 180) / Math.PI;
        return (((12 + a / 15) % 24) + 24) % 24;
    };
    const speedAt = (x) => Math.max(0, Math.min(1, (x - SPEED_X0) / (SPEED_X1 - SPEED_X0)));
    const apply = (x, y) => {
        if (dragging === 'time') {
            svg.time = timeAt(x, y);
            config.handleTime?.(svg.time);
        }
        else if (dragging === 'speed') {
            svg.speed = speedAt(x);
            config.handleSpeed?.(svg.speed);
        }
    };
    svg.handlePointer = (kind, x, y) => {
        if (kind === 'down') {
            const r = Math.hypot(x - CX, y - CY);
            if (x >= SPEED_X0 - 24 &&
                x <= SPEED_X1 + 24 &&
                Math.abs(y - SPEED_Y) <= 24)
                dragging = 'speed';
            else if (r >= 72 && r <= 124)
                dragging = 'time';
            else
                dragging = null;
            apply(x, y);
        }
        else if (kind === 'move') {
            apply(x, y);
        }
        else {
            dragging = null;
        }
    };
    svg.dispose = () => {
        dragging = null;
    };
    return svg;
}
/**
 * A compass that follows the scene's active camera, flat or in a headset:
 * north is +Z, as on a sphere terrain (`sphere-map`).
 */
export function sceneCompass(b3d, config = {}) {
    const dial = compassDial(config);
    const ahead = new Vector3(0, 0, 1);
    let obs = null;
    let scene = null;
    const attach = () => {
        scene = b3d.scene;
        if (scene == null || obs != null)
            return;
        obs = scene.onBeforeRenderObservable.add(() => {
            const cam = scene?.activeCamera;
            if (cam == null)
                return;
            const d = cam.getDirection(ahead);
            if (Math.abs(d.x) + Math.abs(d.z) < 1e-6)
                return;
            dial.heading = (Math.atan2(d.x, d.z) * 180) / Math.PI;
        });
    };
    if (typeof b3d.whenReady === 'function')
        b3d.whenReady(attach);
    else
        attach();
    dial.dispose = () => {
        if (obs != null)
            scene?.onBeforeRenderObservable.remove(obs);
        obs = null;
    };
    return dial;
}
/**
 * A watch bound to a skybox: the ring follows its `timeOfDay` (which the sky
 * advances itself), and dragging writes `timeOfDay` and `realtimeScale`.
 */
export function skyWatch(skybox, config = {}) {
    const dial = watchDial({
        size: config.size,
        time: skybox.timeOfDay,
        speed: scaleToWatchSpeed(skybox.realtimeScale),
        handleTime: (h) => {
            skybox.timeOfDay = h;
        },
        handleSpeed: (t) => {
            skybox.realtimeScale = watchSpeedToScale(t);
        },
    });
    // The sky moves the clock; a quarter of a second is plenty for a dot.
    const timer = setInterval(() => {
        dial.time = skybox.timeOfDay;
    }, 250);
    const dispose = dial.dispose;
    dial.dispose = () => {
        clearInterval(timer);
        dispose();
    };
    return dial;
}
//# sourceMappingURL=dials.js.map