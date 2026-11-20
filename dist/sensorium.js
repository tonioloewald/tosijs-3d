/*#
# sensorium

What a creature can perceive, as pure rules: its SENSORIUM (how far it sees,
in front and behind, and how well it hears) against a DETECTABLE (where a
thing is, how conspicuous it is, and whether a clear line reaches it) and
the NOISES around it. AI-DESIGN's sensorium, first version; the NPC brain
([npc-brain](/npc-brain/)) turns what is perceived into alertness.

The rules:

- **In front** (within `sightDeg`, 180° by default) it notices you out to
  `sightRange` (50 m), if a clear line reaches you: cover hides you.
- **Behind** it notices you within `nearRange` (10 m), line or not: it hears
  your footsteps or feels you there.
- **Crouching** multiplies both by your `conspicuity`: `STEALTH` (0.33) when
  sneaking, so you can creep to 3.3 m behind someone.
- **A noise** (a shot, an explosion) is heard from any direction within the
  distance it carries, times the listener's `hearing`.

```javascript
import { notices, hears, STEALTH } from 'tosijs-3d/sensorium'

const guard = { x: 0, z: 0, heading: 0 } // facing +z
notices(guard, {}, { x: 0, z: 40, clearLine: true }) // 'seen'
notices(guard, {}, { x: 0, z: -8, clearLine: false }) // 'sensed': behind, close
notices(guard, {}, { x: 0, z: -8, clearLine: false, conspicuity: STEALTH }) // null
hears(guard, {}, { x: 20, z: 0, carries: 25 }) // true
```

Headings are degrees, 0 = +z, 90 = +x, as in [agent-driver](/agent-driver/).

## The senses

A sense is a CHANNEL: arcs around the creature, each with its own
sensitivity; a way the signal travels; and what makes a thing show up on it.
Two are built (sight, as `notices`, and hearing, as `hears`); the rest are
slots, named here so the shapes agree when they come.

| Channel | Arcs | Travels | A thing shows up by |
|---|---|---|---|
| `vision` ✅ | front cone far, behind near (a step now; a falloff with the angle later) | line of sight, cut by cover; light and fog | being conspicuous (crouching: `STEALTH`), light, movement |
| `hearing` ✅ | all round | spreads, fades with distance; walls muffle | noise: shots, blasts, footsteps, things landing |
| `smell` | all round, best downwind | carried by the wind; lingers as a trail | scent, and the trail it leaves |
| `vibration` | all round | through the ground | mass and footfall; vehicles |
| `echolocation` | a forward cone | line of sight, short | shape (works in the dark) |
| `ir` | a cone | line of sight; cut by glass and cover | heat: bodies, engines, fire |
| `radar` | a cone or a sweep | line of sight, long | radar cross-section ([b3d-radar](/b3d-radar/)'s `profile`) |
| `rdf` | all round, a bearing only | radio | transmitting (direction, not range) |

Each creature's sensorium will carry a sensitivity per channel and arc, and
each thing a profile per channel (conspicuity, noise, scent, heat, …).
*/
/*{ "parent": "b3d-npc" }*/
import { bearingDeg } from './agent-driver.js';
/** A crouching body's conspicuity: it is noticed at a third of the distance. */
export const STEALTH = 0.33;
export const DEFAULT_SENSORIUM = {
    sightRange: 50,
    sightDeg: 180,
    nearRange: 10,
    hearing: 1,
};
/** Whether `d` is in front of the observer (within half of `sightDeg` of its heading). */
export function inFront(o, s, d) {
    const deg = s.sightDeg ?? DEFAULT_SENSORIUM.sightDeg;
    return Math.abs(bearingDeg(o, o.heading, d)) <= deg / 2;
}
/**
 * Whether the observer notices `d`: `'seen'` in front with a clear line,
 * `'sensed'` behind within reach, else null. `keen` multiplies the ranges (an
 * alert creature looks harder).
 */
export function notices(o, s, d, keen = 1) {
    const sense = { ...DEFAULT_SENSORIUM, ...s };
    const k = (d.conspicuity ?? 1) * keen;
    const dist = Math.hypot(d.x - o.x, d.z - o.z);
    if (inFront(o, sense, d))
        return d.clearLine && dist <= sense.sightRange * k ? 'seen' : null;
    return dist <= sense.nearRange * k ? 'sensed' : null;
}
/** Whether the observer hears `n`, from any direction. */
export function hears(o, s, n) {
    const hearing = s.hearing ?? DEFAULT_SENSORIUM.hearing;
    return Math.hypot(n.x - o.x, n.z - o.z) <= n.carries * hearing;
}
//# sourceMappingURL=sensorium.js.map