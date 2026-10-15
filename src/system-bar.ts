/*#
# system-bar

**The scene's system bar: one row of buttons, flat and in a headset.** Flat it
sits in the top-left corner of the screen; in a headset, up ahead where the
settings panel used to hang. It opens the scene's settings panel (the owl),
the panels you put on it (`<tosi-b3d-panel preset="system-bar" icon="backpack">`
for an inventory: it opens under the bar), and carries Enter or Exit VR and
full screen. One UI, arranged a little differently on each.

It does not re-implement its buttons. It MIRRORS a list of real HTML buttons:
a button that is hidden (by its `hidden` attribute or by a style, such as
`::part(enterVrButton) { display: none }`) is not drawn, one that is disabled
is drawn dimmed and ignores a press, its icon and title come along, and a press
calls that button's own `click()`. So entering VR and going full screen keep
their one definition, and both still run inside the press the browser requires
for them. `<tosi-b3d flat-ui="dom">` keeps the HTML ones flat.

```javascript
import { systemBar } from 'tosijs-3d/system-bar'

const bar = systemBar([gearButton, vrButton, fullscreenButton])
// bar.svg: give it to a frame panel (its handlePointer is on it)
// bar.dispose(): stop watching the buttons
```
*/
/*{ "parent": "b3d-panel", "order": 30 }*/

import { svgElements } from 'tosijs'
import type { PointerKind } from './box.js'
import { panelRim } from './panel-rim.js'

/** Is `b` set to `display: none` by a style (its own, or the page's)? */
function styledAway(b: HTMLElement): boolean {
  if (!b.isConnected) return b.style.display === 'none'
  return getComputedStyle(b).display === 'none'
}

const SIZE = 40
const GAP = 6
const PAD = 4

export interface SystemBar {
  /** The toolbar's SVG, with `handlePointer` for a frame panel to route to. */
  svg: SVGSVGElement
  /** How many buttons it is showing (0: nothing to show). */
  readonly count: number
  dispose: () => void
}

/** Mirror `buttons` as an SVG toolbar: what shows, what is enabled, and a press is their click. */
export function systemBar(buttons: HTMLButtonElement[]): SystemBar {
  const { svg, g, rect } = svgElements
  const root = svg({
    xmlns: 'http://www.w3.org/2000/svg',
  }) as unknown as SVGSVGElement
  let shown: HTMLButtonElement[] = []
  let pressed = -1
  let hover = -1

  const indexAt = (x: number, y: number) => {
    if (y < PAD || y > PAD + SIZE) return -1
    const i = Math.floor((x - PAD) / (SIZE + GAP))
    const within = x - PAD - i * (SIZE + GAP)
    return i >= 0 && i < shown.length && within <= SIZE ? i : -1
  }

  const build = () => {
    // Hidden by the attribute, or by the page's own styling (a
    // `::part(enterVrButton) { display: none }` should hide it here too).
    shown = buttons.filter((b) => !b.hidden && !styledAway(b))
    const w = shown.length
      ? PAD * 2 + shown.length * SIZE + (shown.length - 1) * GAP
      : 1
    const h = PAD * 2 + SIZE
    root.setAttribute('viewBox', `0 0 ${w} ${h}`)
    root.setAttribute('width', String(w))
    root.setAttribute('height', String(h))
    root.textContent = ''
    // The lozenge behind them, and the outline every panel wears (heavier
    // than the HTML lozenge's hairline: it is drawn into a texture and seen
    // smaller than its pixels).
    root.append(
      rect({ x: 0, y: 0, width: w, height: h, rx: h / 2, fill: 'rgba(20,24,32,0.72)' }),
      panelRim(w, h, h / 2)
    )
    shown.forEach((b, i) => {
      const x = PAD + i * (SIZE + GAP)
      const lit = !b.disabled && (i === pressed || i === hover)
      const icon = b.querySelector('svg')?.cloneNode(true) as SVGSVGElement
      if (icon) {
        icon.setAttribute('x', String(x + 8))
        icon.setAttribute('y', String(PAD + 8))
        icon.setAttribute('width', String(SIZE - 16))
        icon.setAttribute('height', String(SIZE - 16))
        // The page's stylesheet does not reach a texture: say the colour here.
        icon.setAttribute('color', '#e8eef8')
        icon.style.removeProperty('height')
      }
      root.append(
        g(
          { opacity: b.disabled ? '0.35' : '1' },
          rect({
            x,
            y: PAD,
            width: SIZE,
            height: SIZE,
            rx: SIZE / 2,
            fill: lit ? 'rgba(74,158,255,0.55)' : 'rgba(255,255,255,0.06)',
          }),
          ...(icon ? [icon] : [])
        )
      )
    })
  }

  const handlePointer = (kind: PointerKind, x: number, y: number) => {
    const i = kind === 'leave' ? -1 : indexAt(x, y)
    if (kind === 'down') pressed = i
    else if (kind === 'up') {
      // A press is down and up on the same button, as a click is.
      if (i >= 0 && i === pressed && !shown[i].disabled) shown[i].click()
      pressed = -1
    } else if (kind === 'leave') pressed = -1
    if (i !== hover || kind !== 'move') {
      hover = i
      build()
    }
  }
  ;(root as unknown as { handlePointer: typeof handlePointer }).handlePointer =
    handlePointer

  // What shows, what is enabled and the icon all live on the HTML buttons.
  const watch = new MutationObserver(build)
  for (const b of buttons)
    watch.observe(b, {
      attributes: true,
      attributeFilter: ['hidden', 'disabled', 'title', 'style', 'class', 'part'],
      childList: true,
    })
  build()

  return {
    svg: root,
    get count() {
      return shown.length
    },
    dispose() {
      watch.disconnect()
    },
  }
}
