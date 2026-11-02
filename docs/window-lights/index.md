# window-lights

**Lit windows at night.** A material plugin that finds a building's window
glass by its colour and lights some of the rooms behind it: warm lamplight
mostly, now and then the blue of a screen. Which rooms are lit is a hash of
where they are, so a room stays lit or dark as you drive past.

Every room has a **habit**, from the same hash, and keeps it:

| Habit | Share | Lit |
|-------|-------|-----|
| always dark | 15% | never (empty, or nobody home) |
| night owl | 30% | 7 pm to 2 am |
| early riser | 20% | 5 to 8 am, and 6 to 10 pm |
| evening | 17% | 5.30 to 11.30 pm |
| bathroom | 18% | a few minutes now and then, any hour of the night |

Each room keeps its own hours up to an hour either side, so a street does not
switch at once. Together: busiest around ten, rare after midnight, back up
from five as people get up. Nothing shows by day. [b3d-city](/b3d-city/) puts
it on Kenney's buildings.

```javascript
const lights = windowLights(material, { origin: cityRoot })
// every frame:
lights.hour = skybox.timeOfDay
lights.glow = darkness // 0 by day, 1 at night
```

The glass is any texel distinctly blue: Kenney's city kits draw their windows
from one light blue. A room is `room` metres across (default 4 × 3 × 4: a
couple of windows, one storey).
