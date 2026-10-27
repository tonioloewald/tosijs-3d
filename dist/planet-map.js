/*#
# planet-map

**A real world from its maps.** NASA and NOAA publish the height of the Moon,
Mars and the Earth as flat images, one pixel per patch of latitude and
longitude. This turns such an image into a [`PlanetSurface`](/sphere-map/):
the thing a [`<tosi-b3d-planet>`](/b3d-planet/) draws a globe from. Set the
planet's `heightMap` and `colorMap` and it is that world.

## Demo

```js
import { b3d, b3dPlanet, spaceBackdrop, select3d, slider3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const WORLDS = {
  Moon: { heightMap: 'nasa/moon/height-2k.png', colorMap: 'nasa/moon/color-2k.jpg', bodyRadiusKm: 1737.4, flatSea: 'off', inlandWater: 'off', clouds: 0, atmosphere: 0, atmosphereColor: 'rgba(77,128,230,0.15)', relief: 12 },
  Mars: { heightMap: 'nasa/mars/height-2k.png', colorMap: 'nasa/mars/color-2k.jpg', bodyRadiusKm: 3389.5, flatSea: 'off', inlandWater: 'off', clouds: 0, atmosphere: 0.006, atmosphereColor: 'rgba(225,165,115,0.04)', relief: 14 },
  // NOAA's heights include the sea floor; `flatSea` fills the oceans level.
  Earth: { heightMap: 'noaa/earth/height-2k.png', colorMap: 'nasa/earth/color-2k.jpg', bodyRadiusKm: 6371, flatSea: 'on', inlandWater: 'on', clouds: 0.45, atmosphere: 0.03, atmosphereColor: 'rgba(77,128,230,0.15)', relief: 30 },
}
const { real } = tosi({ real: { world: 'Earth', relief: WORLDS.Earth.relief, spin: 0.03, clouds: WORLDS.Earth.clouds, storms: 3, stormIntensity: 1 } })
const planet = b3dPlanet({ radius: 50, subdivisions: 160, ocean: 0, rotationSpeed: real.spin, ...WORLDS.Earth })

// Storms on the Earth: a hurricane off the Caribbean, a cyclone in the
// south-west Pacific and a typhoon in the Philippine Sea (the fourth, and
// four is as many as a planet takes), each turning the right way for its
// hemisphere. And one
// that is real: the Catatumbo lightning over Lake Maracaibo in Venezuela,
// a thunderstorm that stands in the same place most nights of the year
// (`cyclone: 0`: it does not turn). Swing round to the night side to see
// them flicker.
const STORMS = {
  Earth: [
    { lat: 24, lon: -62, size: 6, intensity: 1, lightning: 1.5 },
    { lat: -17, lon: 160, size: 5, intensity: 0.9, lightning: 1 },
    { lat: 9.5, lon: -71.5, size: 2.2, intensity: 0.8, lightning: 4, cyclone: 0 },
    { lat: 17, lon: 133, size: 7, intensity: 1, lightning: 1.2 },
  ],
}
// None of the weather is a picture: the cloud cover and the storms are
// computed as you watch, so all of it is dials. A stronger storm winds
// harder, flashes more and is wider.
const setStorms = () => {
  const k = real.stormIntensity.value
  const wide = 0.6 + 0.4 * k
  planet.storms = k <= 0 ? [] : (STORMS[real.world.value] ?? []).slice(0, real.storms.value).map((s) => ({ ...s, size: s.size * wide, intensity: s.intensity * k, lightning: s.lightning * k }))
}
setStorms()
real.storms.observe(setStorms)
real.stormIntensity.observe(setStorms)
real.clouds.observe(() => {
  planet.clouds = real.clouds.value
  planet.updateOptions()
})

real.world.observe(() => {
  const w = WORLDS[real.world.value]
  setStorms()
  Object.assign(planet, w)
  real.relief.value = w.relief
  real.clouds.value = w.clouds
  planet.regenerate()
})
real.relief.observe(() => {
  planet.relief = real.relief.value
  planet.regenerate()
})

preview.append(
  b3d(
    {
      scenePanelOpen: true,
      panelTitle: 'Real worlds',
      scenePanel: () => [
        select3d({ label: 'world', value: real.world, options: Object.keys(WORLDS) }),
        slider3d({ label: 'relief (× true)', value: real.relief, min: 1, max: 60, step: 1 }),
        slider3d({ label: 'rotation', value: real.spin, min: 0, max: 0.3, step: 0.01 }),
        slider3d({ label: 'clouds', value: real.clouds, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'storms', value: real.storms, min: 0, max: 4, step: 1 }),
        slider3d({ label: 'storm intensity', value: real.stormIntensity, min: 0, max: 2, step: 0.05 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera('orbit', -Math.PI / 2.4, Math.PI / 2.3, 150, BABYLON.Vector3.Zero(), el.scene)
        camera.lowerRadiusLimit = 65
        camera.upperRadiusLimit = 500
        camera.maxZ = 3000
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    ...spaceBackdrop({ sky: '/sky' }),
    planet,
  )
)
```
```css
.preview { height: 100%; }
```

The Moon, Mars and the Earth from NASA's and NOAA's own measurements. Drag to
turn them. `relief` exaggerates the heights: at 1 a planet is as smooth as a
billiard ball, which is the truth, and somewhere past 10 it becomes a relief
map.

The Earth's weather is not part of the picture: `clouds`, `storms` (how
many) and `storm intensity` are dials, and the cover and the cyclones are
worked out as you watch.

Credits: Moon and Mars from NASA's Scientific Visualization Studio (LRO LOLA
and LROC; MGS MOLA and Viking); the Earth's colour from NASA's Blue Marble and
its heights from NOAA's ETOPO 2022. Each file names its source and licence in
its response headers.

## From code

```javascript
import { loadPlanetMap, assetUrl } from 'tosijs-3d'

const moon = await loadPlanetMap(assetUrl('nasa/moon/height-2k.png'))
moon.radius            // 1737400, read from the file's own headers
moon.heightAt({ x: 1, y: 0, z: 0 }) // metres above the datum at 0°N 0°E
```

## What the image has to be

- **A 16-bit greyscale PNG**, where `metres = value − 32768`. Sixteen bits
  because eight cannot hold a planet: Everest and the Mariana Trench are
  twenty kilometres apart and a byte has 256 steps. A browser's own image
  decoding gives eight bits a channel, so this module reads the PNG itself.
- **Equirectangular, 2:1**: longitude −180° to +180° left to right, latitude
  +90° to −90° top to bottom. It is what the public data comes in.

The maps on `cdn.tosijs.net` (`nasa/moon`, `nasa/mars`, `nasa/earth`,
`noaa/earth`, each at `1k`, `2k` and `4k`) are in this form, and say so in
their response headers along with the body's radius, the credit and the
licence. `loadPlanetMap` reads the radius from there.

## Options

| | |
| --- | --- |
| `radius` | The body's radius in metres. Unset, the file's `body-radius-km` header, which a browser shows only to a page on the same origin unless the server exposes it; from another host, pass it |
| `seaLevel` | Height of the datum or sea, metres. Default `0` |
| `floor` | Nothing is reported lower than this. `0` on the Earth fills the oceans level, which is what a globe with a blue sea wants; unset, the sea floor is ground |

## The pieces

`decodeGray16Png(bytes)` is the decoder (any 16-bit greyscale,
non-interlaced PNG) and `mapSurface(map, options)` wraps decoded heights as a
surface, sampling between pixels and wrapping at the date line. Both are pure:
no DOM, no engine.
*/
/*{ "parent": "space", "order": 62 }*/
import { unzlibSync } from 'fflate';
import { directionToLatLon, } from './sphere-map.js';
const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
/**
 * Read a 16-bit greyscale PNG. Throws, by name, for anything else: a height
 * map misread as eight bits or as colour still looks like terrain.
 */
export function decodeGray16Png(bytes) {
    for (let i = 0; i < 8; i++)
        if (bytes[i] !== SIGNATURE[i])
            throw new Error('planet-map: not a PNG');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let width = 0;
    let height = 0;
    const idat = [];
    let total = 0;
    for (let at = 8; at + 8 <= bytes.length;) {
        const length = view.getUint32(at);
        const type = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]);
        const body = at + 8;
        if (type === 'IHDR') {
            width = view.getUint32(body);
            height = view.getUint32(body + 4);
            const depth = bytes[body + 8];
            const colour = bytes[body + 9];
            const interlace = bytes[body + 12];
            if (depth !== 16 || colour !== 0)
                throw new Error(`planet-map: a height map must be 16-bit greyscale (this is ${depth}-bit, colour type ${colour})`);
            if (interlace !== 0)
                throw new Error('planet-map: interlaced PNGs are not read');
        }
        else if (type === 'IDAT') {
            const part = bytes.subarray(body, body + length);
            idat.push(part);
            total += part.length;
        }
        else if (type === 'IEND')
            break;
        at = body + length + 4; // + CRC
    }
    if (width === 0 || height === 0)
        throw new Error('planet-map: no IHDR');
    const packed = new Uint8Array(total);
    let o = 0;
    for (const part of idat) {
        packed.set(part, o);
        o += part.length;
    }
    const raw = unzlibSync(packed);
    const stride = width * 2;
    if (raw.length < (stride + 1) * height)
        throw new Error('planet-map: the image data is short');
    // Undo the row filters in place: each byte is predicted from the pixel to
    // its left (2 bytes back), the one above, and the one above-left.
    const row = new Uint8Array(stride);
    const prev = new Uint8Array(stride);
    const data = new Uint16Array(width * height);
    for (let y = 0; y < height; y++) {
        const start = y * (stride + 1);
        const filter = raw[start];
        for (let i = 0; i < stride; i++) {
            const x = raw[start + 1 + i];
            const a = i >= 2 ? row[i - 2] : 0;
            const b = prev[i];
            const c = i >= 2 ? prev[i - 2] : 0;
            let v;
            if (filter === 0)
                v = x;
            else if (filter === 1)
                v = x + a;
            else if (filter === 2)
                v = x + b;
            else if (filter === 3)
                v = x + ((a + b) >> 1);
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);
                v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
            }
            else
                throw new Error(`planet-map: unknown row filter ${filter}`);
            row[i] = v & 255;
        }
        for (let x = 0; x < width; x++)
            data[y * width + x] = (row[x * 2] << 8) | row[x * 2 + 1];
        prev.set(row);
    }
    return { width, height, data };
}
/**
 * A decoded height map as a surface. Between pixels it blends the four
 * around the point; east of the last column is the first (the date line),
 * and past a pole it holds the pole's row.
 */
export function mapSurface(map, options) {
    const { width, height, data } = map;
    const offset = options.offset ?? -32768;
    const floor = options.floor ?? -Infinity;
    const at = (px, py) => {
        const x = ((px % width) + width) % width;
        const y = py < 0 ? 0 : py >= height ? height - 1 : py;
        return data[y * width + x];
    };
    return {
        radius: options.radius,
        seaLevel: options.seaLevel ?? 0,
        heightAt(direction) {
            const { lat, lon } = directionToLatLon(direction);
            // Pixel CENTRES: column 0 is centred half a pixel east of −180°.
            const fx = ((lon + 180) / 360) * width - 0.5;
            const fy = ((90 - lat) / 180) * height - 0.5;
            const x0 = Math.floor(fx);
            const y0 = Math.floor(fy);
            const tx = fx - x0;
            const ty = fy - y0;
            const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
            const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
            const metres = top * (1 - ty) + bottom * ty + offset;
            return metres < floor ? floor : metres;
        },
    };
}
/**
 * Fetch a height map and return it as a surface. The radius comes from
 * `options.radius`, else the response's `body-radius-km` header (the maps on
 * the CDN carry it); with neither, it throws rather than guess a planet.
 */
export async function loadPlanetMap(url, options = {}) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`planet-map: ${url} answered ${response.status}`);
    const km = Number(response.headers.get('body-radius-km'));
    const radius = options.radius ?? (km > 0 ? km * 1000 : 0);
    if (!(radius > 0))
        throw new Error(`planet-map: no radius for ${url} (pass { radius } in metres: the file's body-radius-km header is absent, or hidden from this page because the server does not expose it)`);
    const map = decodeGray16Png(new Uint8Array(await response.arrayBuffer()));
    return mapSurface(map, { ...options, radius });
}
//# sourceMappingURL=planet-map.js.map