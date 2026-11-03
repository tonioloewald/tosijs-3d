/*#
# scene description

**The 3D view in words**, for a screen reader: what you are in, which way you
face, the time of day, and the named things nearby with how far and which way.
It is the same reading the agents' `scene` tool gives (see
[agents](/b3d-agent/)), said as sentences instead of numbers:

> City Drive. You are in the car, facing north-east. It is 17:30, dusk.
> Nearby: end of the street, 58 metres ahead; harbour, 120 metres behind you
> to the right.

`<tosi-b3d>` names its canvas (an image called "<title>, 3D scene") and keeps
this description beside it, visually hidden. It is built only when asked
for: once someone is using the scene's assistive surface (see
[aria mirror](/aria-mirror/)), when the canvas takes focus, and by the
"Describe the scene" button, which also speaks it. Never on a timer. Things are listed when they have
a name (an `id`, or a beacon's `name`): a scene says as much as its author
named.

```javascript
import { describeScene } from 'tosijs-3d/scene-description'
describeScene({ title: 'City Drive', ...sceneEntities(b3d), timeOfDay: 17.5, daylight: 0.3 })
```

Pure: no DOM, no Babylon.
*/
/*{ "parent": "b3d-agent", "order": 20 }*/

/** What a description is made from (the agents' scene reading). */
export interface SceneReading {
  /** The scene's name, said first. */
  title?: string
  you?: { name: string; kind: string; heading?: number } | null
  camera?: { heading?: number } | null
  entities?: Array<{
    name: string
    kind: string
    focused?: boolean
    distance?: number
    bearing?: number
  }>
  timeOfDay?: number
  /** 0 night .. 1 full day. */
  daylight?: number
  /** At most this many nearby things (default 5). */
  limit?: number
}

const COMPASS = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
]

/** Degrees (0 = +z, taken as north; 90 = +x, east) as a compass word. */
export function compassWord(heading: number): string {
  const i = Math.round((((heading % 360) + 360) % 360) / 45) % 8
  return COMPASS[i]
}

/** A bearing (degrees to turn, negative left) as words. */
export function directionWords(bearing: number): string {
  const b = Math.abs(bearing)
  const side = bearing < 0 ? 'left' : 'right'
  if (b < 22.5) return 'ahead'
  if (b < 67.5) return `ahead to the ${side}`
  if (b < 112.5) return `to your ${side}`
  if (b < 157.5) return `behind you to the ${side}`
  return 'behind you'
}

/** Metres as a person says them. */
export function distanceWords(m: number): string {
  if (m < 1.5) return 'right here'
  if (m < 1000) {
    const r = m < 20 ? Math.round(m) : Math.round(m / 5) * 5
    return `${r} metres`
  }
  const km = Math.round(m / 100) / 10
  return `${km} kilometres`
}

/** Hours (0..24) as a clock time. */
export function clockWords(hours: number): string {
  const h = ((hours % 24) + 24) % 24
  let hh = Math.floor(h)
  let mm = Math.round((h - hh) * 60)
  if (mm === 60) {
    mm = 0
    hh = (hh + 1) % 24
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function lightWord(timeOfDay: number | undefined, daylight: number): string {
  if (daylight >= 0.6) return 'day'
  if (daylight < 0.15) return 'night'
  const morning = timeOfDay !== undefined && ((timeOfDay % 24) + 24) % 24 < 12
  return morning ? 'dawn' : 'dusk'
}

const IN_KIND: Record<string, string> = {
  car: 'in the car',
  tank: 'in the tank',
  aircraft: 'flying the aircraft',
  biped: 'on foot',
}

/** The scene in sentences. */
export function describeScene(r: SceneReading): string {
  const out: string[] = []
  if (r.title) out.push(`${r.title}.`)
  const facing = r.you?.heading ?? r.camera?.heading
  if (r.you) {
    const where = IN_KIND[r.you.kind] ?? `in the ${r.you.name || r.you.kind}`
    const lead = `You are ${where}`
    out.push(
      facing !== undefined
        ? `${lead}, facing ${compassWord(facing)}.`
        : `${lead}.`
    )
  } else if (facing !== undefined) {
    out.push(`You are looking ${compassWord(facing)}.`)
  }
  if (r.timeOfDay !== undefined) {
    const light =
      r.daylight !== undefined ? `, ${lightWord(r.timeOfDay, r.daylight)}` : ''
    out.push(`It is ${clockWords(r.timeOfDay)}${light}.`)
  }
  const near = (r.entities ?? [])
    .filter((e) => !e.focused && e.name !== '')
    .slice(0, r.limit ?? 5)
    .map((e) => {
      const bits = [e.name]
      if (e.distance !== undefined) bits.push(distanceWords(e.distance))
      let s = bits.join(', ')
      if (e.bearing !== undefined && (e.distance ?? 2) >= 1.5)
        s += ` ${directionWords(e.bearing)}`
      return s
    })
  out.push(
    near.length > 0
      ? `Nearby: ${near.join('; ')}.`
      : 'Nothing nearby has a name.'
  )
  return out.join(' ')
}
