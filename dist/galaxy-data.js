/*#
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
| `GalaxyOptions` | spiralArms, spiralAngleDegrees, minRadius, maxRadius, thickness, distantGalaxies, generatePlanets |

*/
/*{ "parent": "Space", "order": 900 }*/
import { PRNG, CheapPRNG } from './mersenne-twister.js';
import { SPECTRAL_CLASSES, SPECTRAL_WEIGHTS } from './spectral-classes.js';
// A CYCLE, deliberately and safely: voxel-galaxy imports this module too, but
// neither reads the other at module evaluation — see spectral-classes.
import { voxelGalaxy } from './voxel-galaxy.js';
// --- Utilities ---
export function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
export function romanNumeral(n) {
    const units = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'];
    if (!n)
        return '';
    if (n < 0 || n >= 20)
        return String(n);
    if (n >= 10)
        return 'x' + romanNumeral(n - 10);
    return units[n - 1];
}
// --- Profanity Filter ---
const badwords = [
    'anal',
    'anus',
    'arse',
    'ass',
    'balls',
    'bastard',
    'bitch',
    'bloody',
    'boob',
    'butt',
    'clit',
    'cock',
    'coon',
    'crap',
    'cum',
    'cunt',
    'damn',
    'dick',
    'dildo',
    'dyke',
    'fag',
    'fuck',
    'hell',
    'homo',
    'jizz',
    'kock',
    'lust',
    'nazi',
    'nig',
    'penis',
    'piss',
    'poop',
    'porn',
    'prick',
    'pube',
    'pussy',
    'rape',
    'rectum',
    'scrotum',
    'sex',
    'shit',
    'slut',
    'smegma',
    'spunk',
    'tit',
    'turd',
    'twat',
    'vagina',
    'vulva',
    'wank',
    'whore',
];
function isBadWord(s) {
    const lower = s.toLowerCase();
    return badwords.some((w) => lower.includes(w));
}
// --- Name Generation ---
const nameParts = {
    prefix: [
        'a',
        'aeg',
        'ai',
        'alf',
        'alph',
        'amn',
        'an',
        'and',
        'apt',
        'arct',
        'ard',
        'ath',
        'aur',
        'b',
        'bell',
        'bet',
        'bor',
        'c',
        'call',
        'can',
        'canc',
        'cap',
        'ceph',
        'ch',
        'chl',
        'cr',
        'cz',
        'delt',
        'drac',
        'e',
        'eps',
        'f',
        'fom',
        'g',
        'gamm',
        'gall',
        'gat',
        'gemi',
        'gn',
        'gr',
        'h',
        'heph',
        'her',
        'holl',
        'i',
        'in',
        'ind',
        'ir',
        'j',
        'k',
        'kn',
        'l',
        'lep',
        'lin',
        'lov',
        'm',
        'malth',
        'mar',
        'med',
        'mir',
        'mirc',
        'n',
        'nept',
        'o',
        'or',
        'pers',
        'p',
        'ph',
        'plei',
        'plut',
        'pn',
        'poll',
        'pr',
        'ps',
        'pt',
        'pyr',
        'q',
        'qu',
        'r',
        'rig',
        's',
        'sag',
        'sc',
        'sir',
        'str',
        't',
        'taur',
        'tell',
        'th',
        'tn',
        'trop',
        'ts',
        'u',
        'ull',
        'ult',
        'ur',
        'v',
        'veg',
        'vesp',
        'vr',
        'w',
        'wh',
        'wr',
        'x',
        'xz',
        'y',
        'z',
        'z',
    ],
    middle: [
        'acl',
        'ac',
        'ad',
        'aedr',
        'agg',
        'al',
        'alh',
        'alr',
        'alt',
        'am',
        'an',
        'apr',
        'aqu',
        'ar',
        'ath',
        'cul',
        'e',
        'ec',
        'ed',
        'ef',
        'egg',
        'elg',
        'em',
        'en',
        'eph',
        'er',
        'et',
        'i',
        'iat',
        'ib',
        'ic',
        'id',
        'ig',
        'il',
        'ir',
        'isc',
        'ist',
        'itt',
        'od',
        'of',
        'om',
        'on',
        'oph',
        'opt',
        'orp',
        'om',
        'oth',
        'ue',
        'ulp',
        'ulph',
        'ur',
        'und',
        'us',
        'ut',
        'uu',
    ],
    suffix: [
        'a',
        'ae',
        'ai',
        'anae',
        'ao',
        'ar',
        'arn',
        'aur',
        'aut',
        'ea',
        'ei',
        'el',
        'eo',
        'eon',
        'eos',
        'es',
        'ga',
        'ho',
        'holm',
        'hus',
        'i',
        'ia',
        'iea',
        'ii',
        'io',
        'ion',
        'is',
        'las',
        'o',
        'oe',
        'oea',
        'oi',
        'oia',
        'on',
        'one',
        'or',
        'orn',
        'os',
        'ov',
        'ova',
        'u',
        'ua',
        'ue',
        'ula',
        'uo',
        'um',
        'un',
        'us',
        'ux',
        'z',
    ],
    secondary: [
        'Major',
        'Minor',
        'Secundus',
        'Tertius',
        'Quartus',
        'Quintus',
        'Septimus',
        'Octavus',
        'Nonus',
        'Decimus',
    ],
};
export function randomName(prng, numberOfSyllables, allowSecondName = true, allowSecondary = true) {
    const syllables = [];
    syllables.push(prng.pick(nameParts.prefix));
    for (let j = 2; j < numberOfSyllables; j++) {
        syllables.push(prng.pick(nameParts.middle));
    }
    syllables.push(prng.pick(nameParts.suffix));
    let name = syllables.join('');
    const suffix = prng.pick(['', 'first-name', 'second-name', 'secondary'], [8, 1, 1, 4]);
    switch (suffix) {
        case 'first-name':
            if (allowSecondName) {
                name =
                    capitalize(randomName(prng, prng.range(2, numberOfSyllables), false, false)) +
                        ' ' +
                        name;
            }
            break;
        case 'second-name':
            if (allowSecondName) {
                name =
                    name +
                        ' ' +
                        capitalize(randomName(prng, prng.range(2, numberOfSyllables), false));
            }
            break;
        case 'secondary':
            if (allowSecondary) {
                name += ' ' + prng.pick(nameParts.secondary);
            }
            break;
    }
    return capitalize(name);
}
export const starTypeData = {
    O: {
        luminosity: 250000,
        color: 'rgb(255,192,255)',
        rgb: [255, 192, 255],
        planets: [0, 3],
        mass: 50,
        lifespan: 5.6e5,
        inSpiralArm: 0.9,
    },
    B: {
        luminosity: 800,
        color: 'rgb(192,160,255)',
        rgb: [192, 160, 255],
        planets: [1, 5],
        mass: 6.5,
        lifespan: 9.3e7,
        inSpiralArm: 0.9,
    },
    A: {
        luminosity: 20,
        color: 'rgb(128,192,255)',
        rgb: [128, 192, 255],
        planets: [1, 7],
        mass: 2.1,
        lifespan: 1e9,
        inSpiralArm: 0.5,
    },
    F: {
        luminosity: 2.5,
        color: 'rgb(160,255,128)',
        rgb: [160, 255, 128],
        planets: [1, 11],
        mass: 1.3,
        lifespan: 5.1e9,
        inSpiralArm: 0.4,
    },
    G: {
        luminosity: 0.79,
        color: 'rgb(255,255,64)',
        rgb: [255, 255, 64],
        planets: [1, 19],
        mass: 0.79,
        lifespan: 1.2e10,
        inSpiralArm: 0.3,
    },
    K: {
        luminosity: 0.16,
        color: 'rgb(255,192,64)',
        rgb: [255, 192, 64],
        planets: [1, 9],
        mass: 0.69,
        lifespan: 2.5e10,
        inSpiralArm: 0.25,
    },
    M: {
        luminosity: 0.0027,
        color: 'rgb(255,64,0)',
        rgb: [255, 64, 0],
        planets: [1, 5],
        mass: 0.15,
        lifespan: 1.1e12,
        inSpiralArm: 0.1,
    },
};
// --- Planet Physics ---
function gravity(radius, density) {
    return (density / 5.56) * (radius / 6557);
}
function blackbody(insolation, albedo = 0) {
    return Math.pow((1367 * insolation * (1 - albedo)) / (4 * 0.0000000567), 0.25);
}
const atmosphereData = {
    Breathable: { albedo: 0.2, density: 1 },
    Filterable: { albedo: 0.3, density: 1 },
    Inert: { albedo: 0.1, density: 0.5 },
    Corrosive: { albedo: 0.5, density: 2 },
    Toxic: { albedo: 0.4, density: 1.5 },
    Trace: { albedo: 0.05, density: 0.1 },
    Crushing: { albedo: 0.8, density: 100 },
};
function computeHI(insolation, radius, density, hydrographics, atmosphere) {
    const g = gravity(radius, density).toFixed(2);
    const { albedo } = atmosphereData[atmosphere];
    const tempK = blackbody(insolation, albedo + hydrographics * 0.002).toFixed(1);
    const tempC = Number(tempK) - 275.15;
    let temp;
    if (tempC < -150)
        temp = 'frigid';
    else if (tempC < -80)
        temp = 'extremely cold';
    else if (tempC < -40)
        temp = 'very cold';
    else if (tempC < -10)
        temp = 'cold';
    else if (tempC < 30)
        temp = 'temperate';
    else if (tempC < 50)
        temp = 'hot';
    else if (tempC < 90)
        temp = 'very hot';
    else if (tempC < 150)
        temp = 'extremely hot';
    else
        temp = 'inferno';
    const tempCStr = tempC.toFixed(1);
    let data;
    const gNum = Number(g);
    if (atmosphere === 'Breathable' &&
        hydrographics > 0 &&
        gNum < 1.25 &&
        ['cold', 'hot', 'temperate'].includes(temp)) {
        data = { HI: 1, description: 'earthlike' };
    }
    else if (['Breathable', 'Filterable'].includes(atmosphere) &&
        gNum < 2 &&
        !['inferno', 'extremely hot', 'extremely cold', 'frigid'].includes(temp)) {
        data = { HI: 2, description: 'survivable' };
    }
    else if (atmosphere === 'Crushing' ||
        gNum > 3 ||
        ['inferno', 'frigid'].includes(temp)) {
        data =
            tempC > 800
                ? { HI: 5, description: 'inimical' }
                : { HI: 4, description: 'robot accessible' };
    }
    else {
        data = { HI: 3, description: 'EVA possible' };
    }
    return { ...data, g, albedo, tempC: tempCStr, temp };
}
const planetTypeData = [
    {
        classification: 'rocky',
        radius: [1000, 15000],
        density: [2, 8],
        hydrographics(prng, insolation, radius, density) {
            const g = gravity(radius, density);
            const tempK = blackbody(insolation, 0);
            return Math.max(0, Math.min(Number((prng.realRange(-50, 150 - Math.abs(tempK - 270)) * g -
                Math.abs(density - 5.5) * 10).toFixed(0)), 100));
        },
        atmosphere(prng, insolation, _radius, _density, hydrographics) {
            if (hydrographics > 0 && insolation > 0.25 && insolation < 2) {
                return prng.pick([
                    'Breathable',
                    'Filterable',
                    'Inert',
                    'Toxic',
                    'Corrosive',
                    'Trace',
                ], [1, 2, 2, 1, 1, 1]);
            }
            else {
                return prng.pick([
                    'Breathable',
                    'Filterable',
                    'Inert',
                    'Toxic',
                    'Corrosive',
                    'Trace',
                ], [1, 2, 3, 4, 5, 5]);
            }
        },
    },
    {
        classification: 'gas giant',
        radius: [15000, 120000],
        density: [0.6, 2.0],
        hydrographics: () => 0,
        atmosphere: () => 'Crushing',
    },
    {
        classification: 'brown dwarf',
        radius: [120000, 250000],
        density: [0.6, 2.0],
        hydrographics: () => 0,
        atmosphere: () => 'Crushing',
    },
];
export { planetTypeData };
// The spectral classes and weights live in a leaf module — see its note.
export { SPECTRAL_CLASSES, SPECTRAL_WEIGHTS };
function generateStarDetail(seed) {
    // A CHEAP prng: detail is derived data, a pure function of the star's seed,
    // and MT construction (~14 µs) × 100k stars is a second and a half of doing
    // nothing. Quality is irrelevant here — determinism is what matters.
    const prng = new CheapPRNG(seed);
    const spectralClass = prng.pick([...SPECTRAL_CLASSES], SPECTRAL_WEIGHTS);
    const spectralIndex = prng.range(0, 9);
    return starDetailFor(prng, seed, spectralClass, spectralIndex);
}
/**
 * Everything a star's CLASS implies, drawn from `prng` in a fixed order.
 *
 * Split out of `generateStarDetail` so a generator that chooses the class
 * itself (the voxel galaxy picks from a bright or a dim mix) shares the one
 * definition instead of a copy. The draw order is unchanged, so every existing
 * galaxy is byte-identical (galaxy-data.test pins it by digest).
 */
export function starDetailFor(prng, seed, spectralClass, spectralIndex) {
    const template = starTypeData[spectralClass];
    const luminosity = (template.luminosity * 3) / (spectralIndex + 2);
    const mass = (template.mass * 5) / (spectralIndex + 2);
    const numberOfPlanets = prng.range(template.planets[0], template.planets[1]);
    const planetSeed = prng.range(0, 1000000);
    const inSpiralArm = prng.value() < template.inSpiralArm;
    let s = Math.log(luminosity) + 4;
    s = Math.max(Math.min(s, 20), 2) * 0.5;
    return {
        seed,
        spectralType: spectralClass + spectralIndex,
        spectralClass,
        spectralIndex,
        luminosity,
        mass,
        numberOfPlanets,
        planetSeed,
        rgb: template.rgb,
        color: template.color,
        inSpiralArm,
        lifespan: template.lifespan,
        scale: s / 5,
    };
}
function generatePlanetDetail(name, seed, orbitalRadius, insolation) {
    const prng = new PRNG(seed);
    const template = prng.pick(planetTypeData, [insolation * 100, 10, 1]);
    const radius = prng.range(template.radius[0], template.radius[1]);
    const density = prng.realRange(template.density[0], template.density[1]);
    const hydrographics = template.hydrographics(prng, insolation, radius, density);
    const atmosphere = template.atmosphere(prng, insolation, radius, density, hydrographics);
    const hi = computeHI(insolation, radius, density, hydrographics, atmosphere);
    // Gas giants can have rings — larger ones more likely
    let rings = 0;
    if (template.classification === 'gas giant') {
        // Normalize radius: small gas giant ~15000km, large ~75000km
        const sizeFactor = Math.min(1, (radius - 15000) / 60000);
        // Chance of no rings: 0.5 for small, 0.1 for large
        const noRingChance = 0.5 - sizeFactor * 0.4;
        if (!prng.probability(noRingChance)) {
            rings = prng.realRange(0.1, 1);
        }
    }
    return {
        name,
        seed,
        orbitalRadius: Number(orbitalRadius.toFixed(2)),
        insolation: Number(insolation.toFixed(2)),
        classification: template.classification,
        radius,
        density,
        hydrographics,
        atmosphere,
        rings,
        ...hi,
    };
}
export function generateStarSystem(star) {
    const prng = new PRNG(star.planetSeed);
    const radiusMin = 0.4 * prng.realRange(0.5, 2);
    const radiusMax = 50 * prng.realRange(0.5, 2);
    const totalWeight = (Math.pow(star.numberOfPlanets, 2) + star.numberOfPlanets) * 0.5;
    let r = radiusMin;
    const planets = [];
    for (let i = 0; i < star.numberOfPlanets; i++) {
        r += (i / totalWeight) * prng.realRange(0.5, 1) * (radiusMax - radiusMin);
        const orbitalRadius = r;
        const insolation = star.luminosity / Math.pow(r, 2);
        const planetSeed = prng.range(0, 100000);
        const planetName = capitalize(star.name) + '-' + romanNumeral(i + 1);
        planets.push(generatePlanetDetail(planetName, planetSeed, orbitalRadius, insolation));
    }
    return { star, planets };
}
export const GALAXY_DEFAULTS = {
    spiralArms: 4,
    spiralAngleDegrees: 240,
    minRadius: 0.02,
    maxRadius: 0.9,
    thickness: 0.06,
    /** How many external galaxies to scatter around the outside. */
    distantGalaxies: 500,
    /** How many dim far-out stars to scatter around the outside. */
    distantStars: 3000,
    generatePlanets: false,
};
/**
 * A star's NAME, a pure function of its seed — the same derivation the old
 * generator used, shared so every galaxy names a given seed the same way.
 */
export function starNameFor(seed) {
    const namePrng = new CheapPRNG(seed + 1);
    let name = randomName(namePrng, namePrng.range(2, 3));
    while (isBadWord(name))
        name = randomName(namePrng, namePrng.range(2, 3));
    return name;
}
export function spiralParams(opts) {
    const { spiralArms, spiralAngleDegrees, minRadius, maxRadius, thickness } = opts;
    return {
        spiralArms,
        minRadius,
        maxRadius,
        thickness,
        scatterTheta: (Math.PI / spiralArms) * 0.2,
        scatterRadius: minRadius * 0.4,
        spiralB: ((spiralAngleDegrees / Math.PI) * minRadius) / maxRadius,
    };
}
/**
 * THE SPIRAL MODEL — where one star of this galaxy lands. The draws are in a
 * fixed order on `prng`, which is what lets `sampleSpiral` and the old star loop
 * agree to the last bit.
 */
function spiralPosition(prng, inSpiralArm, sp) {
    let x, y;
    let r = prng.realRange(sp.minRadius, sp.maxRadius);
    if (inSpiralArm) {
        // The gaussian can swing r NEGATIVE, and Math.log of a negative is NaN
        // — one star in ~100k landed at (NaN, NaN, z). Clamp to the disc.
        r = Math.max(1e-6, r + prng.gaussrandom(sp.scatterRadius));
        let theta = sp.spiralB * Math.log(r / sp.maxRadius) +
            prng.gaussrandom(sp.scatterTheta);
        theta += (prng.range(0, sp.spiralArms - 1) * Math.PI * 2) / sp.spiralArms;
        x = Math.cos(theta) * r;
        y = Math.sin(theta) * r;
    }
    else {
        r *= prng.realRange(1, 1.1);
        const theta = prng.realRange(0, Math.PI * 2);
        x = Math.cos(theta) * r;
        y = Math.sin(theta) * r;
    }
    const z = prng.gaussrandom(sp.thickness * 0.5 * (1 - r));
    return { x, y, z };
}
/**
 * `n` positions drawn from the spiral model — POSITIONS ONLY: no names, no
 * star details beyond the one bit that picks arm or disc. This is what the
 * voxel galaxy's density grid is sampled from (GALAXY-DESIGN.md →
 * "Reconciliation"): the MODEL survives, the sequential generator does not.
 *
 * It consumes exactly the draws the old star loop did, so a density sampled
 * here is byte-identical to one sampled from `generateGalaxy`'s stars.
 */
export function sampleSpiral(seed, n, options = {}) {
    const sp = spiralParams({ ...GALAXY_DEFAULTS, ...options });
    const prng = new PRNG(seed);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
        const starSeed = prng.range(1, 100000);
        out[i] = spiralPosition(prng, inSpiralArmFor(starSeed), sp);
    }
    return out;
}
/** The one detail the position needs, without building the rest. */
function inSpiralArmFor(starSeed) {
    return generateStarDetail(starSeed).inSpiralArm;
}
/**
 * @deprecated Use `voxelGalaxy({ seed, brightBudget }).view()`. Removed in 0.9.
 *
 * ONE GALAXY (GALAXY-DESIGN.md → "Reconciliation"). This used to be its own
 * generator: one sequential random stream producing the stars, then the
 * nebulae, then the distant shell, so nothing could be generated locally and
 * 63% of stars shared a seed with another. It is now an ADAPTER over the voxel
 * galaxy: `numberOfStars` is the BRIGHT budget, and the result is that
 * galaxy's `view()` (every bright star, its nebulae and shell) in the shape
 * this function always returned. The spiral model it was built on survives as
 * `sampleSpiral`, which is what the voxel galaxy's density is sampled from.
 *
 * A given seed therefore produces a DIFFERENT galaxy from 0.8.3's: same
 * shape and distributions, different stars.
 */
export function generateGalaxy(seed, numberOfStars, options = {}) {
    return voxelGalaxy({
        seed,
        brightBudget: numberOfStars,
        // No dim population: `numberOfStars` stays the whole star count, as it
        // always was. Interesting stars are the voxel galaxy's to offer.
        dimBudget: 0,
        galaxyOptions: options,
    }).view({ generatePlanets: options.generatePlanets === true });
}
/*
OTHER GALAXIES — pale yellow through orange, and the colour is not a taste.

They read warm because they are OLD stellar populations, reddened further by
redshift. Nothing out there is blue at that distance, and nothing is white,
so this palette deliberately shares no range with the foreground stars.
*/
function distantGalaxyColor(t) {
    return [
        255,
        Math.round(236 - t * 60), // 236 → 176
        Math.round(198 - t * 96), // 198 → 102
    ];
}
/**
 * The galaxy's NEBULAE on the spiral model, drawn from `prng`. Split out so the
 * voxel galaxy draws them from its own derived seed (GALAXY-DESIGN.md →
 * "Reconciliation") while the old stream keeps its order.
 */
export function generateNebulae(prng, nebulaCount, sp) {
    /*
    OPACITY FALLS AS THE COUNT RISES, because they ADD.
  
    Nebula count is tied to star count, and the baker's star slider spans 5k to
    100k — a 20× swing, which at fixed opacity is a 20× swing in how much glow is
    piled onto the same sky. A galaxy tuned at 10k blows out white at 100k, and
    that is not a tuning error to be re-tuned at each setting: it is the count
    being a brightness dial nobody meant to turn. Tonio: "we probably should turn
    down nebula opacity as we raise the count."
  
    SQRT, not linear. Holding the total constant (ref/count) is the other obvious
    choice and it is worse: at 10x the count each nebula gets a tenth the opacity,
    so no individual one is visible and the result is a uniform wash. Under sqrt
    the sky still gets richer as you add nebulae — it just stops getting brighter
    in proportion — which is what "more detail" should mean.
  
    Clamped both ways so a small galaxy is not dim and a huge one is not gone.
    */
    const NEBULA_REFERENCE = 1500; // ≈ the 10k-star default, where this was tuned
    const densityScale = Math.min(1.5, Math.max(0.3, Math.sqrt(NEBULA_REFERENCE / nebulaCount)));
    const nebulae = [];
    // Nebula color from a continuous spectrum: purple → green → orange
    function nebulaColor(t) {
        // t=0 purple, t=0.5 green, t=1 orange
        if (t < 0.5) {
            const s = t * 2; // 0..1
            return [
                Math.round(140 + s * -80), // 140 → 60
                Math.round(60 + s * 140), // 60 → 200
                Math.round(220 + s * -40), // 220 → 180
            ];
        }
        else {
            const s = (t - 0.5) * 2; // 0..1
            return [
                Math.round(60 + s * 195), // 60 → 255
                Math.round(200 - s * 60), // 200 → 140
                Math.round(180 - s * 100), // 180 → 80
            ];
        }
    }
    /** Dust vs glow. One number, applied everywhere — see the note at the draw. */
    const DARK_FRACTION = 0.5;
    /** Core-bound nebulae, REGARDLESS of the total count — see `inCore`. */
    const CORE_NEBULA_BUDGET = 150;
    // Dark nebula color: black → brown
    function darkNebulaColor(t) {
        return [
            Math.round(t * 60), // 0 → 60
            Math.round(t * 35), // 0 → 35
            Math.round(t * 15), // 0 → 15
        ];
    }
    for (let i = 0; i < nebulaCount; i++) {
        /*
        ABOUT ONE IN ELEVEN SITS ON THE CORE, which is scenery with a job.
    
        The central black hole reads as an object rather than as a galactic centre
        when you can see all of it against empty space — Tonio: "If the black hole
        weren't enormous and were obscured by some nebulae it would be basically
        perfect." Veiling it is the better half of that than shrinking it, and it is
        also what the real thing looks like: the Milky Way's centre is behind so
        much dust that we cannot see it in visible light at all.
        */
        /*
        A FIXED BUDGET, not a fraction. The core is ONE visual feature, and it
        should not grow nine times brighter just because the galaxy has nine
        times the nebulae — a 0.09 fraction put ~1,400 blobs on the core at
        100k (against ~135 at 10k), and the coreward bake face peaked at
        247/255: blinding. 150 is the count the 10k galaxy had when the core
        looked right, so that is what every galaxy gets.
        */
        const inCore = i < CORE_NEBULA_BUDGET;
        /*
        HALF DUST, HALF GLOW — everywhere, core included. Tonio: "change the mix of
        bright and emissive nebula to 50 50."
    
        The core used to be biased heavily toward dark (0.72) on the reasoning that
        dust is what actually hides a galactic centre, and that is still true; what
        made the bias unnecessary is the opacity scaling above. The veil was being
        asked to do its job against emission nebulae that were individually too
        bright, so it needed numbers on its side. With the glow turned down as the
        count goes up, an even mix covers the core without the middle lighting up.
        One constant now, because two were tuning the same thing from both ends.
        */
        const isDark = prng.probability(DARK_FRACTION);
        let r = inCore
            ? prng.realRange(0, sp.minRadius * 1.3)
            : prng.realRange(sp.minRadius * 0.5, sp.maxRadius);
        // Nebulae follow spiral arms more strongly
        // Same NaN clamp as the star loop: the gaussian can swing r negative.
        r = Math.max(1e-6, r + prng.gaussrandom(sp.scatterRadius * (inCore ? 0.6 : 2)));
        let theta = sp.spiralB * Math.log(r / sp.maxRadius) +
            prng.gaussrandom(sp.scatterTheta * 1.5);
        theta += (prng.range(0, sp.spiralArms - 1) * Math.PI * 2) / sp.spiralArms;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        /*
        FLATTEN THE CORE ONES. `(1 - r)` is the BULGE: with radii normalised, r → 0
        at the centre, so the vertical spread is at its MAXIMUM exactly where these
        sit. That is right for a stellar bulge and wrong for what they are doing
        here — Tonio: "too vertically distributed" — because a veil wants to lie
        across the centre, not stand up through it.
        */
        const z = prng.gaussrandom(sp.thickness * 0.3 * (1 - r) * (inCore ? 0.28 : 1));
        // 50% bigger than the first pass, judged against the live galaxy: at the
        // old size they read as separate puffs rather than as a continuous medium.
        const scale = prng.realRange(2.25, 7.5);
        const opacity = prng.realRange(0.15, 0.5) * densityScale;
        const t = prng.value();
        if (isDark) {
            nebulae.push({
                position: { x, y, z },
                scale,
                rgb: darkNebulaColor(t),
                type: 'dark',
                opacity,
            });
        }
        else {
            nebulae.push({
                position: { x, y, z },
                scale,
                rgb: nebulaColor(t),
                type: 'emission',
                opacity,
            });
        }
    }
    return { nebulae, densityScale };
}
/**
 * The DISTANT SHELL — other galaxies and dim far-out stars, isotropic, outside
 * the disc. Drawn from `prng`, like `generateNebulae`.
 */
export function generateShell(prng, galaxyBudget, starBudget, sp, densityScale) {
    /*
    A BUDGET FOR OTHER GALAXIES, which is what actually fills an empty sky.
  
    Off the galactic band the real sky is not black — it is faint external
    galaxies — and a sky that renders it black is the one that reads as sparse.
    The alternative we tried first was raising star PARTICLE SIZE, which fills the
    frame and turns the nearest stars into dinner plates: stars are billboards
    sized in world units, so the two pull against each other and no single value
    wins. Tonio: "set aside a budget for other galaxies — nebula that are further
    out and pale yellow to orange."
  
    Three things make them read as galaxies rather than as more nebulae:
  
    - **ISOTROPIC**, not along the arms. They are not part of this galaxy, and
      scattering them evenly is the only thing that reaches the poles the band
      cannot.
    - **OUTSIDE** it, on a shell past `maxRadius`, so they never interleave with
      local structure.
    - **SMALL and FAINT.** Their whole job is texture where there is none;
      anything big enough to read as a subject is a different feature.
  
    The caller appends them to `nebulae` on purpose — the emission path already draws
    exactly this, so a whole rendering path is saved by placing them differently
    rather than by inventing them.
    */
    const galaxyCount = Math.max(0, Math.round(galaxyBudget));
    const distantGalaxies = [];
    for (let i = 0; i < galaxyCount; i++) {
        // Uniform on the sphere: z uniform, NOT latitude uniform, or they bunch at
        // the poles — which is precisely the region they exist to populate.
        const u = prng.realRange(-1, 1);
        const theta = prng.realRange(0, Math.PI * 2);
        const r = Math.sqrt(Math.max(0, 1 - u * u));
        const dist = sp.maxRadius * prng.realRange(1.35, 2.9);
        distantGalaxies.push({
            position: {
                x: dist * r * Math.cos(theta),
                y: dist * r * Math.sin(theta),
                z: dist * u,
            },
            /*
            SIZED AGAINST THE DISTANCE, not against "small".
      
            The first pass used 0.5–1.9 while local nebulae are 2.25–7.5, and put them
            2–3× further away on top of that — so they landed roughly twenty times
            smaller on screen and a 1024px face showed essentially nothing. "Small"
            is an ANGULAR judgement and these are the far objects, so the world size
            has to grow to stay legible.
      
            At 3–9 units and 2–3× the distance they subtend about a third to a half of
            a local nebula: still clearly the far things, now actually present.
            */
            scale: prng.realRange(3, 9),
            rgb: distantGalaxyColor(prng.value()),
            type: 'emission',
            // Raised from 0.3–0.55: present rather than merely detectable. They are
            // still the faintest thing in the sky — the point is that the eye finds
            // them without hunting.
            opacity: prng.realRange(0.5, 0.85) * densityScale,
        });
    }
    /*
    DIM FAR-OUT STARS — the same emptiness argument as the distant galaxies,
    but for POINTS. Tonio: "bake in a few thousand distant dim stars (much
    like the distant dim 'galaxy' nebulae) just so there's more going on in
    the empty areas." Isotropic, on the same shell outside the disc, small and
    warm — they are the faintest stars in the sky and their whole job is to
    keep the off-band sky from reading as blank.
    */
    const distantStarCount = Math.max(0, Math.round(starBudget));
    const distantStars = [];
    for (let i = 0; i < distantStarCount; i++) {
        const u = prng.realRange(-1, 1);
        const theta = prng.realRange(0, Math.PI * 2);
        const r = Math.sqrt(Math.max(0, 1 - u * u));
        const dist = sp.maxRadius * prng.realRange(1.35, 2.9);
        distantStars.push({
            position: {
                x: dist * r * Math.cos(theta),
                y: dist * r * Math.sin(theta),
                z: dist * u,
            },
            scale: prng.realRange(0.5, 2.5),
            rgb: [
                255,
                Math.round(210 + prng.realRange(0, 40)),
                Math.round(150 + prng.realRange(0, 40)),
            ],
        });
    }
    return { distantGalaxies, distantStars };
}
//# sourceMappingURL=galaxy-data.js.map