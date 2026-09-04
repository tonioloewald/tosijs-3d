import { describe, expect, test } from 'bun:test'
import { sideFromD, type Side } from './hud-math.js'

// The four thick colored arcs from static/aircraft-hud.svg (AMDN export). normalizeHud
// tags each by geometry → side, then maps side → meter (left=speed, right=altitude,
// top=health, bottom=energy). If these flip, meters bind to the wrong gauge.
describe('sideFromD — designer asset arcs map to the right side', () => {
  const arcs: Record<Side, string> = {
    left: 'M60.1178,195.882 C22.6274,158.392,22.6274,97.6081,60.1178,60.1177',
    right: 'M195.882,195.882 C233.373,158.392,233.373,97.6081,195.882,60.1178',
    top: 'M60.1178,60.1178 C97.6081,22.6274,158.392,22.6274,195.882,60.1178',
    bottom: 'M60.1178,195.882 C97.6081,233.373,158.392,233.373,195.882,195.882',
  }
  // Object.entries() would widen the key back to `string`, so walk typed keys instead.
  for (const side of Object.keys(arcs) as Side[]) {
    test(side, () => expect(sideFromD(arcs[side])).toBe(side))
  }
})
