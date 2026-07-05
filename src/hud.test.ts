import { describe, expect, test } from 'bun:test'
import { sideFromD } from './hud'

// The four thick colored arcs from static/aircraft-hud.svg (AMDN export). normalizeHud
// tags each by geometry → side, then maps side → meter (left=speed, right=altitude,
// top=health, bottom=energy). If these flip, meters bind to the wrong gauge.
describe('sideFromD — designer asset arcs map to the right side', () => {
  const arcs: Record<string, string> = {
    left: 'M60.1178,195.882 C22.6274,158.392,22.6274,97.6081,60.1178,60.1177',
    right: 'M195.882,195.882 C233.373,158.392,233.373,97.6081,195.882,60.1178',
    top: 'M60.1178,60.1178 C97.6081,22.6274,158.392,22.6274,195.882,60.1178',
    bottom: 'M60.1178,195.882 C97.6081,233.373,158.392,233.373,195.882,195.882',
  }
  for (const [side, d] of Object.entries(arcs)) {
    test(side, () => expect(sideFromD(d)).toBe(side))
  }
})
