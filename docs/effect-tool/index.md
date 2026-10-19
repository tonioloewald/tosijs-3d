# Effect tool

**Make an effect: particles, light and sound on one clock.** Start from a
preset (a volcano at any activity, a geyser, a splash, an explosion, a
fireball, sparks), change any layer and see it at once, then save the recipe
for `<tosi-b3d-effect>` to play in a game.

```js
import { effectTool } from 'tosijs-3d/effect-tool'

preview.closest('tosi-example')?.style.setProperty('--tosi-example-height', '600px')
preview.append(effectTool())
```

## Using it

Tap the scene once so the browser lets it make sound.

- **Effect**: the preset, `play` (a one-shot plays again), `stop`, the
  `activity` dial (a volcano: dormant, semi-active, erupting), `mute`, and
  `listen from`: how far away you are. Sound travels at 343 m/s, so at
  300 m an explosion's boom comes almost a second after its flash. `time of
  day` shows the lights at night.
- **Layers**: choose one and change it. Particles: how many, how long they
  live, how fast and big, gravity, wind, height, the first and last colour.
  `picture` swaps the sprite for your own image or SVG (embedded in the
  recipe, so a saved one carries it). A light: its colour, intensity, range
  and flicker. A sound: its voice,
  gain and pitch. Every layer: when it starts and how long it lasts.
- **Recipe**: `save` downloads the recipe as JSON, `load` reads one back,
  `copy` puts it on the clipboard, `start over` goes back to the preset. The
  working recipe is kept in this browser, per preset.

The element carries `.effect`: `recipe` (a copy; set one to play it) and
`player`, for a page or an editor driving the tool.
