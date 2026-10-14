/*#
# rocky-world

**What kind of rock a planet is**, as data: the Moon, Mercury, Mars, Venus and
an Earth, each a sea, an air, clouds, relief, craters and a climate.
[`<tosi-b3d-planet world="moon">`](/b3d-planet/) draws one; the
[star system](/b3d-star-system/) picks one for each rocky planet it makes.

It is the rocky half of [gas-giant](/gas-giant/)'s `GAS_GIANTS`, and works the
same way: a preset is a starting point, and the planet's `seed` makes another
world of the same kind.

The colours come from the biome shader, not from a palette here. A world with
no water at all sits on the chart's DEAD row, where a warm world is red rock
and dust (Mars) and a cold one grey regolith (the Moon); the temperature is
what picks between them. So Mars is "warm" here, which it is not: read the
temperatures as the chart's way of choosing a colour, as Land and Sky's Mars
preset does, until a world has a palette of its own.

| | |
| --- | --- |
| `ocean` | How much of the surface is under water, `0…1` |
| `atmosphere` | The air's thickness, a fraction of the radius; `0` is none |
| `atmosphereColor` | The air's colour and strength, `rgba(…)` |
| `clouds` | How much of the sky is cloud, `0…1` |
| `grossAmplitude`, `detailAmplitude` | Relief, in the planet's own units (its radius is 50 in the demos) |
| `craters` | `density` `0…1`, `size` (the largest, a fraction of the radius), `wear` `0…1`, and `asymmetry` `-1…1`: more craters on one side (see [landform](/landform/)'s `sphereCraters`) |
| `climate` | The biome shader's planetary climate: `equatorTemp`, `temperateTemp`, `poleTemp` (chart units, freezing at 0.36), `mapMoisture`, and `slopeExaggeration` (how steep must read as rock: about 6 for an Earth, 1.5 on cratered ground) |
*/
/*{ "parent": "space", "order": 46 }*/

export interface RockyCraters {
  /** 0…1, as `sphereCraters`' density. */
  density: number
  /** The largest crater's radius, a fraction of the planet's. */
  size: number
  /** 0…1: how worn the old ones are. */
  wear: number
  /** -1…1: more on the planet's local +Z side (a moon's leading side). */
  asymmetry: number
}

export interface RockyClimate {
  equatorTemp: number
  temperateTemp: number
  poleTemp: number
  mapMoisture: number
  /**
   * How much slopes are exaggerated before the cliff test. A globe's relief
   * is gentle, so an Earth wants about 6; on cratered ground that turns most
   * of the surface to bare rock, so an airless world wants about 1.5.
   */
  slopeExaggeration: number
}

export interface RockyWorldLook {
  ocean: number
  atmosphere: number
  atmosphereColor: string
  clouds: number
  cloudColor: string
  grossAmplitude: number
  detailAmplitude: number
  craters: RockyCraters
  climate: RockyClimate
}

const NO_CRATERS: RockyCraters = { density: 0, size: 0.15, wear: 0.6, asymmetry: 0 }

export const ROCKY_WORLDS: Record<string, RockyWorldLook> = {
  // Grey, airless, saturated with craters, more on the far side.
  moon: {
    ocean: 0,
    atmosphere: 0,
    atmosphereColor: '',
    clouds: 0,
    cloudColor: '#ffffff',
    grossAmplitude: 2,
    detailAmplitude: 0.6,
    craters: { density: 0.85, size: 0.18, wear: 0.7, asymmetry: 0.25 },
    climate: { equatorTemp: 0.02, temperateTemp: 0.01, poleTemp: 0, mapMoisture: 0, slopeExaggeration: 1.5 },
  },
  // Like the Moon but darker, browner and less worn: no air, no weather.
  mercury: {
    ocean: 0,
    atmosphere: 0,
    atmosphereColor: '',
    clouds: 0,
    cloudColor: '#ffffff',
    grossAmplitude: 2.5,
    detailAmplitude: 0.6,
    craters: { density: 0.9, size: 0.16, wear: 0.45, asymmetry: 0 },
    climate: { equatorTemp: 0.42, temperateTemp: 0.36, poleTemp: 0.25, mapMoisture: 0, slopeExaggeration: 1.5 },
  },
  // Red dust, thin pink air, old worn craters, ice at the poles.
  mars: {
    ocean: 0,
    atmosphere: 0.03,
    atmosphereColor: 'rgba(230,160,110,0.14)',
    clouds: 0.04,
    cloudColor: '#f0e0d0',
    grossAmplitude: 5,
    detailAmplitude: 1,
    craters: { density: 0.35, size: 0.12, wear: 0.85, asymmetry: 0 },
    climate: { equatorTemp: 1, temperateTemp: 0.95, poleTemp: 0.15, mapMoisture: 0, slopeExaggeration: 2.5 },
  },
  // Hidden under a closed yellow deck; the ground is hot rock.
  venus: {
    ocean: 0,
    atmosphere: 0.12,
    atmosphereColor: 'rgba(230,200,120,0.3)',
    clouds: 1,
    cloudColor: '#ead9a8',
    grossAmplitude: 3,
    detailAmplitude: 0.8,
    craters: { density: 0.1, size: 0.08, wear: 0.9, asymmetry: 0 },
    climate: { equatorTemp: 1, temperateTemp: 1, poleTemp: 0.95, mapMoisture: 0, slopeExaggeration: 2 },
  },
  // Seas, blue air, weather; the biome shader's own climate.
  earth: {
    ocean: 0.6,
    atmosphere: 0.08,
    atmosphereColor: 'rgba(77,128,230,0.15)',
    clouds: 0.45,
    cloudColor: '#ffffff',
    grossAmplitude: 5,
    detailAmplitude: 1,
    craters: NO_CRATERS,
    // The shader's own defaults, written out so that leaving another
    // world for this one resets the climate rather than keeping its.
    climate: { equatorTemp: 0.85, temperateTemp: 0.55, poleTemp: 0.05, mapMoisture: 0.45, slopeExaggeration: 6 },
  },
}

/** A preset by name; an unknown name is null (the planet's own settings). */
export function resolveRockyWorld(name: string): RockyWorldLook | null {
  return ROCKY_WORLDS[String(name || '').toLowerCase()] ?? null
}
