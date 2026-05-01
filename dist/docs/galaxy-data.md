# galaxy-data

Procedural galaxy generation data and functions. Pure logic — no Babylon.js
dependency. Ported from the galaxy-b8r project.

Generates a galaxy of stars with spiral arm distribution, each star with
spectral class, luminosity, mass, and a deterministic set of planets with
radius, density, atmosphere, temperature, and habitability index.

All generation is seeded — same seed always produces the same galaxy.

## Demo

```js
import { PRNG, generateGalaxy, generateStarSystem } from 'tosijs-3d'
import { elements } from 'tosijs'
const { div, p, pre, table, tr, td, th, thead, tbody } = elements

const galaxy = generateGalaxy(1234, 100)

let output = `Galaxy: ${galaxy.stars.length} stars\n\n`
output += 'First 10 stars:\n'
for (let i = 0; i < 10; i++) {
  const s = galaxy.stars[i]
  output += `  ${s.name.padEnd(20)} ${s.spectralType.padEnd(4)} `
  output += `L=${s.luminosity.toFixed(2).padStart(10)} `
  output += `planets=${s.numberOfPlanets}\n`
}

output += '\nStar system for star 0 (' + galaxy.stars[0].name + '):\n'
const system = generateStarSystem(galaxy.stars[0])
for (const planet of system.planets) {
  output += `  ${planet.name.padEnd(25)} ${planet.classification.padEnd(12)} `
  output += `${planet.description.padEnd(16)} `
  output += `${planet.atmosphere.padEnd(12)} `
  output += `${planet.tempC}°C\n`
}

preview.append(pre(output))
```

## API

### `generateGalaxy(seed, count, options?)`

Returns `{ stars: StarData[] }`. Each star has position, spectral type,
luminosity, mass, planet count, and a deterministic seed for system generation.

### `generateStarSystem(star)`

Returns `{ star: StarData, planets: PlanetData[] }` with full planet detail.

### Types

| Type | Key Fields |
| --- | --- |
| `StarData` | name, seed, position, spectralType, luminosity, mass, numberOfPlanets, rgb |
| `PlanetData` | name, classification, orbitalRadius, radius, density, atmosphere, tempC, HI, description |
| `GalaxyOptions` | spiralArms, spiralAngleDegrees, minRadius, maxRadius, thickness |