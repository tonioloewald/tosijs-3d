# 0.10.2

<!--{ "parent": "CHANGELOG", "order": 9989998 }-->

## Added

- **Gas giants in the sky.** `<tosi-b3d-moon gas="jupiter">` (also `saturn`,
  `uranus`, `neptune`) draws a banded planet with winds that alternate from
  belt to belt and a great storm, lit by the real sun so its phase is right.
  `bands`, `turbulence`, `storm`, `bandColors`, `axisTilt`, `spin` and `seed`
  override the preset. The shader is one function in the new `gas-giant`
  module (`GAS_GIANT_GLSL`, `resolveGasGiant`).
- **Gas giants in space.** `<tosi-b3d-planet gas="saturn">` is the same
  planet as a body you can fly round, and the star system's gas giants are
  now banded (which of the four looks each gets follows from its seed).
  `createGasGiantMaterial(scene, look)` puts one on any sphere. In both
  places the planet is lit as a ball of gas: the limb darkens and the day
  side has a thin rim of haze.
- **`<tosi-b3d-moon frame="ground">`**: the body is placed against the
  horizon and stays there while the stars and sun go round, like the planet a
  tide-locked moon orbits. Land and Sky's Io has Jupiter in its sky.

- **`<tosi-b3d-planet>` rings are configurable**: `ringInner`, `ringOuter`
  (planet radii), `ringOpacity` and `ringColor`. A gas giant takes its
  preset's ring by default: Saturn's broad and bright, the others thin and
  nearly invisible. The planet also takes `bands`, `turbulence`, `storm` and
  `bandColors`.
- **`colorPicker3d`**: a colour as one row. Tap the swatch and a popup opens
  with the HSV(A) picker and a grid of presets (yours first, then a general
  set). Takes a reactive value, like the other controls. **+** saves the
  colour you are on as a swatch and the bin takes swatches away; saved
  swatches are shared by every picker on the page and kept in the browser
  (`sharedSwatches()`, or `createSwatchStore(storage)` for your own). The
  popup has a title bar with close and move, captioned with the row's label.
- **A popup's title band can carry a caption**: `title` on `showLayer`.

## Fixed

- **Climbing onto a moving lift no longer leaves the biped waist deep in its
  deck.** The climb aimed at where the deck was when it began; the landing now
  travels with whatever is being climbed.
- **A climb no longer slides a crouching body up the face.** The climb clips
  open with a wind-up, and the path rose from the first frame. It now waits
  for the pull (`CLIMB_PHASE` in `mantle`; `mantlePath` takes a `riseStarts`).

- **Decorations sit on the ground that is drawn.** Rocks and trees were
  placed on the terrain's true height, but the drawn mesh cuts under any bump
  between its vertices, so they floated. Each is now lowered by the bump the
  mesh lacks (`seatDip` in `scatter`, using the terrain's new `meshCell`).
  Standing on a slope buries nothing.
- **An airless world fades to black at the terrain's edge.** With no air the
  haze was pushed out to millions of metres and the far tiles popped in
  against the sky. `terrain.drawnReach` is how far the ground is drawn. It
  needs linear fog (a `<tosi-b3d-fog>` in its default mode), applies only to
  a world with no air (not to climbing out of one that has it), and anything
  fogged that stands beyond the terrain's edge goes black with it.
- **Land and Sky: Mars and the Moon have rocks.** `decorator.rules = null`
  goes back to the library's own rules.
- **(behaviour) Planets in a star system are lit.** The star's light
  followed its luminosity (`min(L × 0.5, 5)`), so anything dimmer than the sun
  left its planets nearly black (a K0 star gave 0.12). It now follows the
  fourth root, `1.6 × L^0.25` kept between 1.2 and 3.5: a sun-like star goes
  from 0.5 to 1.6, about three times brighter, and the brightest stars come
  down from 5 to 3.5.
- **Docs: the star system and panel pages each showed an empty live example.**
  A note between a demo and its CSS split the CSS off into an example of its
  own, and left the demo without its styles.

Size: barrel (min, packages external) 987.8 KB raw / 333.6 KB gz, +1.6% on 0.10.1.
