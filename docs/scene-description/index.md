# scene description

**The 3D view in words**, for a screen reader: what you are in, which way you
face, the time of day, and the named things nearby with how far and which way.
It is the same reading the agents' `scene` tool gives (see
[agents](/b3d-agent/)), said as sentences instead of numbers:

> City Drive. You are in the car, facing north-east. It is 17:30, dusk.
> Nearby: end of the street, 58 metres ahead; harbour, 120 metres behind you
> to the right.

`<tosi-b3d>` names its canvas (an image called "<title>, 3D scene") and keeps
this description beside it, visually hidden. It is built only when asked
for: once someone is using the scene's assistive surface (see
[aria mirror](/aria-mirror/)), when the canvas takes focus, and by the
"Describe the scene" button, which also speaks it. Never on a timer. Things are listed when they have
a name (an `id`, or a beacon's `name`): a scene says as much as its author
named.

```javascript
import { describeScene } from 'tosijs-3d/scene-description'
describeScene({ title: 'City Drive', ...sceneEntities(b3d), timeOfDay: 17.5, daylight: 0.3 })
```

Pure: no DOM, no Babylon.
