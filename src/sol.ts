/*#
# sol

**Our own solar system, as data**: the Sun, the eight planets in order, the
moons worth drawing and the asteroid belt's four biggest bodies, each with
its true radius and the look that draws it. Give it to a
[star system](/b3d-star-system/) (`system.system = SOL`) and it lays it out
like any other (see [system-layout](/system-layout/)): true order, true
sizes compressed, distances on a log scale.

Every body has a generated look ([rocky-world](/rocky-world/) and
[gas-giant](/gas-giant/)). The Earth, the Moon and Mars also have `maps`:
NASA's and NOAA's own height and colour maps (see [planet-map](/planet-map/)),
which a star system with `maps="on"` uses instead. Phobos and Deimos are too
small to have pulled themselves round, so they are drawn as rocks.
*/
/*{ "parent": "b3d-star-system", "order": 20 }*/

import type { SystemSpec } from './system-layout.js'

const MOON_MAPS = {
  heightMap: 'nasa/moon/height-2k.png',
  colorMap: 'nasa/moon/color-2k.jpg',
  bodyRadiusKm: 1737.4,
  relief: 12,
  atmosphere: 0,
  clouds: 0,
}

export const SOL: SystemSpec = {
  star: {
    name: 'Sol',
    rgb: [255, 242, 175],
    luminosity: 1,
    spectralType: 'G2V',
  },
  planets: [
    { name: 'Mercury', au: 0.39, radiusKm: 2440, day: 58.65, look: { world: 'mercury' } },
    { name: 'Venus', au: 0.72, radiusKm: 6052, day: -243.0, look: { world: 'venus' } },
    {
      name: 'Earth',
      day: 0.997,
      au: 1,
      radiusKm: 6371,
      look: { world: 'earth' },
      maps: {
        heightMap: 'noaa/earth/height-2k.png',
        colorMap: 'nasa/earth/color-2k.jpg',
        bodyRadiusKm: 6371,
        flatSea: 'on',
        inlandWater: 'on',
        relief: 30,
        ocean: 0,
        atmosphere: 0.03,
        clouds: 0.45,
      },
      moons: [
        {
          name: 'Moon',
          radiusKm: 1737,
          look: { world: 'moon' },
          maps: MOON_MAPS,
        },
      ],
    },
    {
      name: 'Mars',
      day: 1.026,
      au: 1.52,
      radiusKm: 3390,
      look: { world: 'mars' },
      maps: {
        heightMap: 'nasa/mars/height-2k.png',
        colorMap: 'nasa/mars/color-2k.jpg',
        bodyRadiusKm: 3389.5,
        relief: 14,
        ocean: 0,
        atmosphere: 0.006,
        atmosphereColor: 'rgba(225,165,115,0.04)',
        clouds: 0,
      },
      moons: [
        { name: 'Phobos', radiusKm: 11, look: { shape: 'rock' } },
        { name: 'Deimos', radiusKm: 6, look: { shape: 'rock' } },
      ],
    },
    {
      name: 'Jupiter',
      day: 0.414,
      au: 5.2,
      radiusKm: 69911,
      rings: 0.1,
      look: { gas: 'jupiter' },
      moons: [
        { name: 'Io', radiusKm: 1822, look: { world: 'io' } },
        { name: 'Europa', radiusKm: 1561, look: { world: 'ice' } },
        { name: 'Ganymede', radiusKm: 2634, look: { world: 'moon' } },
        {
          name: 'Callisto',
          radiusKm: 2410,
          look: { world: 'moon', craters: 0.95 },
        },
      ],
    },
    {
      name: 'Saturn',
      day: 0.444,
      au: 9.54,
      radiusKm: 58232,
      rings: 1,
      look: { gas: 'saturn' },
      moons: [
        { name: 'Enceladus', radiusKm: 252, look: { world: 'ice' } },
        { name: 'Rhea', radiusKm: 764, look: { world: 'moon' } },
        { name: 'Titan', radiusKm: 2575, look: { world: 'titan' } },
        { name: 'Iapetus', radiusKm: 735, look: { world: 'moon' } },
      ],
    },
    {
      name: 'Uranus',
      day: -0.718,
      au: 19.2,
      radiusKm: 25362,
      rings: 0.15,
      look: { gas: 'uranus' },
      moons: [
        { name: 'Titania', radiusKm: 789, look: { world: 'moon' } },
        { name: 'Oberon', radiusKm: 761, look: { world: 'moon' } },
      ],
    },
    {
      name: 'Neptune',
      day: 0.671,
      au: 30.1,
      radiusKm: 24622,
      rings: 0.1,
      look: { gas: 'neptune' },
      moons: [{ name: 'Triton', radiusKm: 1353, look: { world: 'ice' } }],
    },
  ],
  belt: [
    { name: 'Ceres', radiusKm: 473, look: { world: 'moon', craters: 0.5 } },
    { name: 'Vesta', radiusKm: 263, look: { shape: 'rock' } },
    { name: 'Pallas', radiusKm: 256, look: { shape: 'rock' } },
    { name: 'Hygiea', radiusKm: 217, look: { world: 'moon' } },
  ],
}
