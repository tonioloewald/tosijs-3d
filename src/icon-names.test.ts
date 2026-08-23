import { describe, test, expect } from 'bun:test'
import iconData from './icon-data'

/*
A MISSING ICON NAME IS SILENT — it renders as a plain box, with no error and no
warning. The pause/resume toggle shipped looking like a solid white square, and
the generated icon set was the last place anyone looked, because the glyph
plainly exists in tosijs-ui: our own `icons/` tree is a SEPARATE set, generated
from `icons/*` by `bun run icons`, and it did not have it.

So: every icon name the app hard-codes must exist in the generated data. Add the
name here when you use a new one — the test is the reason the next one fails
loudly at `bun test` instead of quietly in a headset.
*/
const USED_BY_APP = [
  // scene panel icon bar
  'logOut',
  'compass',
  'game',
  'pause',
  'pauseCircle',
  'play',
  'playCircle',
  // panel chrome / debug tools
  'close',
  'move',
  'settings',
  'barChart',
  'bug',
]

describe('every icon the app asks for exists in the generated set', () => {
  test('the generated set is non-empty (a vacuous pass is not a pass)', () => {
    expect(Object.keys(iconData).length).toBeGreaterThan(20)
  })

  for (const name of USED_BY_APP) {
    test(`${name} is present`, () => {
      expect(iconData).toHaveProperty(name)
      expect(String((iconData as Record<string, string>)[name])).toContain(
        '<svg'
      )
    })
  }
})
