import { describe, expect, test } from 'bun:test'
import { holdMenusOn } from './hold-menus.js'
import { DPAD_HOLD_MS } from './radial-layout.js'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A panel with one control that has a ring, at 0,0 20×20. */
const fakePanel = () => {
  const heard: string[] = []
  const opened: string[] = []
  const panel = {
    handlePointer: (kind: string, _x = 0, _y = 0) => void heard.push(kind),
    controls: () => [
      {
        role: 'button',
        name: 'Dagger',
        path: 'dagger',
        box: { x: 0, y: 0, w: 20, h: 20 },
        menu: () => ({
          title: 'Dagger',
          items: [{ label: 'drop' }],
          handleSelect: () => {},
        }),
      },
    ],
  }
  holdMenusOn(panel, (m) => opened.push(m.title ?? ''))
  return { panel, heard, opened }
}

describe('holdMenusOn', () => {
  test('a still press and hold on a control with a menu opens it; the panel forgets the press', async () => {
    const { panel, heard, opened } = fakePanel()
    panel.handlePointer('down', 10, 10)
    await wait(DPAD_HOLD_MS + 40)
    expect(opened).toEqual(['Dagger'])
    panel.handlePointer('move', 30, 30)
    panel.handlePointer('up', 30, 30)
    expect(heard).toEqual(['down', 'leave'])
  })

  test('a quick press is the panel’s', async () => {
    const { panel, heard, opened } = fakePanel()
    panel.handlePointer('down', 10, 10)
    panel.handlePointer('up', 10, 10)
    await wait(DPAD_HOLD_MS + 40)
    expect(opened).toEqual([])
    expect(heard).toEqual(['down', 'up'])
  })

  test('a press that moves first is a drag, not a ring', async () => {
    const { panel, opened } = fakePanel()
    panel.handlePointer('down', 10, 10)
    panel.handlePointer('move', 18, 18)
    await wait(DPAD_HOLD_MS + 40)
    expect(opened).toEqual([])
  })

  test('a press off any control with a menu is left alone', async () => {
    const { panel, opened } = fakePanel()
    panel.handlePointer('down', 50, 50)
    await wait(DPAD_HOLD_MS + 40)
    expect(opened).toEqual([])
  })
})
