/*#
# moon light

Where a sky's night light comes from when it has moons of its own
(`<tosi-b3d-moon>`): the brightest moon ABOVE the horizon, as bright as the
part of it lit by the real sun that faces you (full opposite the sun, dark
beside it). A moon below the horizon lights nothing, and with every moon set
the night has only its ambient light.

```javascript
import { moonLight } from 'tosijs-3d/moon-light'

// The real sun below the horizon to the east; one moon up in the west.
moonLight([{ x: -0.6, y: 0.8, z: 0 }], { x: 0.8, y: -0.6, z: 0 })
// { dir: { x: -0.6, y: 0.8, z: 0 }, strength: 0.98, index: 0 }
```

Pure: plain `{x, y, z}` world directions, toward each body, unit length.
*/
/*{ "parent": "b3d-moon" }*/
/** The night light from moons at `moons` with the real sun at `sun`. */
export function moonLight(moons, sun) {
    let best = { dir: null, strength: 0, index: -1 };
    moons.forEach((d, index) => {
        if (!(d.y > 0))
            return; // set: under the ground
        const strength = (1 - (d.x * sun.x + d.y * sun.y + d.z * sun.z)) / 2;
        if (best.index < 0 || strength > best.strength)
            best = { dir: d, strength, index };
    });
    return best;
}
//# sourceMappingURL=moon-light.js.map