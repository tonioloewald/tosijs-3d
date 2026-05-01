# gamepad-svg

Generates a gamepad SVG using tosijs element creators. All colors and stroke
width are configurable via a defaults object. Elements use `data-part` attributes
(not IDs) so multiple instances can coexist.

## Color variables

| Variable | Default | Used by |
|----------|---------|---------|
| `strokeColor` | `#000000` | All stroked elements |
| `strokeWidth` | `16` | All stroked elements |
| `widgetColor` | `#ffffff` | Bumpers, triggers, dpad, sticks, menu, view |
| `controllerColor` | `#aaaaaa` | Controller body |
| `stickTravelColor` | `#505050` | Stick travel circles |
| `fillA` | `#ff1d25` | A button (red) |
| `fillB` | `#fcee22` | B button (yellow) |
| `fillX` | `#8cc63f` | X button (green) |
| `fillY` | `#3ea9f5` | Y button (blue) |

## Usage

```typescript
import { gamepadSvg } from 'tosijs-3d'

// Full gamepad with default colors
const pad = gamepadSvg()

// Custom colors
const dark = gamepadSvg({ controllerColor: '#333', widgetColor: '#888' })
```