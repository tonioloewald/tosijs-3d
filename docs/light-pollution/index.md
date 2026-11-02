# light pollution

A lit town washes the stars out of its own sky. In the middle of a city at
night only the brightest few show, under a warm glow along the horizon;
drive out into the country and the rest come back.

Anything that lights up the night registers a SOURCE with the scene: where it
is, how far its glow reaches, and how strong it is now (a city's follows its
street lights, so it is nothing by day). The sky asks how polluted the sky is
at the camera, every frame, and dims its faint stars and adds the glow.

```javascript
import { lightPollutionSource } from 'tosijs-3d'

// A town of 500 m across whose lights are on.
const release = lightPollutionSource(scene, {
  centre: () => ({ x: 0, z: 0 }),
  radius: 250,
  strength: () => 0.9,
})
```

`<tosi-b3d-city>` registers one for itself. `<tosi-b3d-skybox>` reads them,
and its `lightPollution` attribute is the base for the whole sky (0, a dark
sky; 0.3, a suburb's), which the sources add to.

## How it adds up

Inside a source's `radius` its full strength; outside, it falls off with the
square of the distance in radii, so a town three radii away still pales the
sky a little. Two sources combine like two veils: `1 - (1 - a)(1 - b)`, so the
total never passes 1.
