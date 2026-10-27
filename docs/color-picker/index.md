# colorPicker3d

**A colour as one row: tap the swatch, pick in a popup.** The popup holds the
[[color-field|color3d]] picker (saturation and value, hue, optional alpha) and
a grid of presets, because most of the time the colour you want is one you
have used before. After the swatches come two more squares: **+** saves the
colour you are on, and the **bin** switches to taking swatches away (tap it,
tap what should go, tap it again to stop). Saved swatches are shared by every
picker on the page and kept in the browser. One row tall when closed, so a panel can carry a dozen
colours without becoming a wall of pickers.

It is all SVG, like every control here, so it is the same thing on a flat
panel and on one in a headset.

## Demo

```js
import { panel3d, label3d, colorPicker3d } from 'tosijs-3d'
import { elements, tosi } from 'tosijs'

const { div } = elements
const { bandDemo } = tosi({ bandDemo: { zones: '#e9dcc1', belts: '#a9774c', accent: '#b4502f', haze: '#dfe9ff66' } })
const stripes = div({ class: 'stripes' })
const show = () => {
  stripes.style.background = `linear-gradient(${[
    bandDemo.zones.value, bandDemo.belts.value, bandDemo.zones.value,
    bandDemo.accent.value, bandDemo.belts.value, bandDemo.zones.value,
  ].join(',')})`
}
// The haze has ALPHA: it is laid over the bands, and how much shows through
// is part of the colour.
const haze = div({ class: 'haze' })
stripes.append(haze)
const showHaze = () => { haze.style.background = bandDemo.haze.value }
for (const k of ['zones', 'belts', 'accent']) bandDemo[k].observe(show)
bandDemo.haze.observe(showHaze)
show()
showHaze()

const planetColours = ['#e9dcc1', '#a9774c', '#b4502f', '#e8d8ac', '#4a78dc', '#b4e6e8']
preview.append(
  panel3d({ width: 300 },
    label3d({ text: 'Bands' }),
    colorPicker3d({ label: 'zones', value: bandDemo.zones, alpha: false, presets: planetColours }),
    colorPicker3d({ label: 'belts', value: bandDemo.belts, alpha: false, presets: planetColours }),
    colorPicker3d({ label: 'accent', value: bandDemo.accent, alpha: false, presets: planetColours }),
    // alpha is on unless you turn it off: a second strip in the picker, and
    // the value becomes #rrggbbaa.
    colorPicker3d({ label: 'haze (with alpha)', value: bandDemo.haze }),
  ),
  stripes,
)
```
```css
.preview { display: flex; gap: 16px; padding: 12px; min-height: 500px; align-items: flex-start; }
.stripes { width: 120px; height: 180px; border-radius: 60px; flex: none; overflow: hidden; }
.haze { width: 100%; height: 100%; }
```

Three colours for a planet's bands and a translucent haze over them. Each row
opens its own popup; the presets are the ones passed in, then a general set.
The haze row keeps its alpha strip, the others turn it off.

## Options

| Option | Default | |
| --- | --- | --- |
| `label` | `''` | The caption on the row |
| `value` | `'#ffffff'` | A colour, or a reactive value holding one |
| `alpha` | `true` | Offer the alpha strip. Off, the value is always `#rrggbb` |
| `presets` | | Colours offered first in the popup: hex strings, or `{ name, value }` |
| `defaultPresets` | `'on'` | `'off'` leaves out the general set, showing only yours |
| `swatches` | shared | Where `+` saves to. Unset, one store for the page, kept in `localStorage` under `tosijs-3d:color-swatches`. Pass `createSwatchStore(yourStorage)` to keep them yourself, or `null` to keep nothing |
| `handleChange` | | Live, including mid-drag. Canonical hex |
| `handleCommit` | | Once per gesture or preset, with the settled value: one undo step |
