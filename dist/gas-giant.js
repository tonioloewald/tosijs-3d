/*#
# gas-giant

**The cloud tops of a gas giant, as one shader function.** Banded, sheared by
winds that alternate direction from belt to belt, with a long-lived storm.
It colours a point on a sphere, so the same code draws a giant hanging in a
moon's sky ([`<tosi-b3d-moon gas="jupiter">`](/b3d-moon/)) and one you orbit.

## Demo

A giant as a body you can fly round:
[`<tosi-b3d-planet gas="saturn">`](/b3d-planet/). Drag to orbit it. The sun
is where the scene's sun is, so swing round to the night side. The bands'
three colours and the ring are yours to set: pick another planet and note how
thin and faint every ring but Saturn's is.

```js
import { b3d, b3dPlanet, spaceBackdrop, GAS_GIANTS, select3d, slider3d, label3d, colorPicker3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const start = GAS_GIANTS.saturn
const { orbit } = tosi({ orbit: {
  kind: 'saturn', seed: 7, spin: 0.03,
  bands: start.bands, turbulence: start.turbulence, storm: start.storm,
  zones: start.colors[0], belts: start.colors[1], accent: start.colors[2],
  rings: 1, ringInner: start.rings.inner, ringOuter: start.rings.outer, ringOpacity: start.rings.opacity, ringColor: start.rings.color,
} })
const planet = b3dPlanet({ gas: orbit.kind, seed: orbit.seed, rotationSpeed: orbit.spin, radius: 50 })

// Everything that changes the planet's look rebuilds it (a sphere: cheap).
const rebuild = () => {
  Object.assign(planet, {
    bands: orbit.bands.value, turbulence: orbit.turbulence.value, storm: orbit.storm.value,
    bandColors: [orbit.zones.value, orbit.belts.value, orbit.accent.value].join(','),
    rings: orbit.rings.value, ringInner: orbit.ringInner.value, ringOuter: orbit.ringOuter.value,
    ringOpacity: orbit.ringOpacity.value, ringColor: orbit.ringColor.value,
  })
  planet.regenerate()
}
// Choosing a planet sets every dial to that planet's own numbers.
orbit.kind.observe(() => {
  const look = GAS_GIANTS[orbit.kind.value]
  Object.assign(orbit, {
    bands: look.bands, turbulence: look.turbulence, storm: look.storm,
    zones: look.colors[0], belts: look.colors[1], accent: look.colors[2],
    ringInner: look.rings.inner, ringOuter: look.rings.outer, ringOpacity: look.rings.opacity, ringColor: look.rings.color,
  })
})
for (const key of Object.keys(orbit.valueOf())) if (key !== 'spin') orbit[key].observe(rebuild)

const planetColours = Object.values(GAS_GIANTS).flatMap((look) => look.colors)
preview.append(
  b3d(
    {
      scenePanelOpen: true,
      panelTitle: 'From space',
      scenePanel: () => [
        select3d({ label: 'planet', value: orbit.kind, options: Object.keys(GAS_GIANTS) }),
        slider3d({ label: 'bands', value: orbit.bands, min: 1, max: 30, step: 1 }),
        slider3d({ label: 'turbulence', value: orbit.turbulence, min: 0, max: 1.5, step: 0.05 }),
        slider3d({ label: 'storm', value: orbit.storm, min: 0, max: 2, step: 0.05 }),
        colorPicker3d({ label: 'zones', value: orbit.zones, alpha: false, presets: planetColours }),
        colorPicker3d({ label: 'belts', value: orbit.belts, alpha: false, presets: planetColours }),
        colorPicker3d({ label: 'accent', value: orbit.accent, alpha: false, presets: planetColours }),
        label3d({ text: 'Rings' }),
        slider3d({ label: 'amount', value: orbit.rings, min: 0, max: 1, step: 0.05 }),
        slider3d({ label: 'inner edge (radii)', value: orbit.ringInner, min: 1.05, max: 3, step: 0.05 }),
        slider3d({ label: 'outer edge (radii)', value: orbit.ringOuter, min: 1.1, max: 4, step: 0.05 }),
        slider3d({ label: 'opacity', value: orbit.ringOpacity, min: 0, max: 1, step: 0.01 }),
        colorPicker3d({ label: 'ring colour', value: orbit.ringColor, alpha: false }),
        label3d({ text: 'Motion' }),
        slider3d({ label: 'seed', value: orbit.seed, min: 1, max: 96, step: 1 }),
        slider3d({ label: 'rotation', value: orbit.spin, min: 0, max: 0.3, step: 0.01 }),
      ],
      sceneCreated(el, BABYLON) {
        const camera = new BABYLON.ArcRotateCamera('orbit', -Math.PI / 3, Math.PI / 2.4, 220, BABYLON.Vector3.Zero(), el.scene)
        camera.lowerRadiusLimit = 70
        camera.upperRadiusLimit = 700
        camera.maxZ = 3000
        camera.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(camera)
      },
    },
    ...spaceBackdrop({ sky: '/sky' }),
    planet,
  )
)
rebuild()
```
```css
.preview { height: 100%; }
```

## In a moon's sky

The same planet hanging over the horizon of one of its moons,
[`<tosi-b3d-moon gas="jupiter">`](/b3d-moon/). Pick a planet, then pull it
about: the dials start at the preset's own values.

```js
import { b3d, b3dSun, b3dSkybox, b3dMoon, b3dGround, GAS_GIANTS, slider3d, select3d, label3d } from 'tosijs-3d'
import { tosi } from 'tosijs'

const { gg } = tosi({ gg: { kind: 'jupiter', size: 28, time: 16, tilt: 10, ...GAS_GIANTS.jupiter } })
const planet = b3dMoon({
  frame: 'ground', azimuth: 22, elevation: 22,
  gas: gg.kind, size: gg.size, axisTilt: gg.tilt,
  bands: gg.bands, turbulence: gg.turbulence, storm: gg.storm,
})
// Choosing a planet resets the dials to that planet's numbers.
gg.kind.observe(() => {
  const look = GAS_GIANTS[gg.kind.value]
  gg.bands.value = look.bands
  gg.turbulence.value = look.turbulence
  gg.storm.value = look.storm
})

preview.append(
  b3d(
    {
      scenePanelOpen: true,
      panelTitle: 'Gas giant',
      scenePanel: () => [
        select3d({ label: 'planet', value: gg.kind, options: Object.keys(GAS_GIANTS) }),
        slider3d({ label: 'bands', value: gg.bands, min: 1, max: 30, step: 1 }),
        slider3d({ label: 'turbulence', value: gg.turbulence, min: 0, max: 1.5, step: 0.05 }),
        slider3d({ label: 'storm', value: gg.storm, min: 0, max: 2, step: 0.05 }),
        slider3d({ label: 'tilt', value: gg.tilt, min: -45, max: 45, step: 1 }),
        slider3d({ label: 'size (degrees)', value: gg.size, min: 2, max: 80, step: 1 }),
        slider3d({ label: 'time of day (its phase)', value: gg.time, min: 0, max: 24, step: 0.25 }),
      ],
      sceneCreated(el, BABYLON) {
        const cam = new BABYLON.FreeCamera('c', new BABYLON.Vector3(0, 2, 0), el.scene)
        cam.setTarget(new BABYLON.Vector3(0, 6, 10))
        cam.attachControl(el.querySelector('canvas'), true)
        el.setActiveCamera(cam)
      },
    },
    b3dSun({}),
    b3dSkybox(
      { timeOfDay: gg.time, realtimeScale: 0, atmosphere: 0, starfieldCube: '/sky/nebula', starfieldData: '/sky/stars', starfieldTilt: '12,25,58' },
      planet,
    ),
    b3dGround({ width: 80, height: 80, color: '#6a6250' }),
  )
)
```
```css
.preview { height: 100%; }
```

## How it works

It is the [cloud deck](/b3d-cloud-deck/)'s idea turned on its side: a noise
field advected by wind. There the wind blows across a plane; here each
latitude has its own wind, which is what draws the bands out into streaks.

## What the numbers mean

| | |
| --- | --- |
| `bands` | How many light and dark stripes from pole to pole, counting both. Jupiter is about 14, Neptune 6. Those near the equator are the broadest |
| `turbulence` | How far the edges of the bands are torn, `0…1`. 0 is ruled lines; 1 is Jupiter |
| `storm` | Size of the great storm, `0…1` of a band's width. 0 is none |
| `colors` | Three: the bright zones, the dark belts, and the accent (the storm, the poles) |
| `seed` | A different planet with the same look |
| `rings` | The preset's ring: `inner` and `outer` edge in planet radii, `opacity` and `color`. Saturn's is broad and bright; the others are thin and nearly invisible, which is true to life |

## Presets

`GAS_GIANTS` has `jupiter`, `saturn`, `uranus` and `neptune`. `resolveGasGiant`
takes a preset name and any overrides and returns the numbers the shader
wants.

## The shader

`GAS_GIANT_GLSL` defines

```glsl
vec3 b3dGasGiant(vec3 n, vec4 k, vec3 c0, vec3 c1, vec3 c2, float t)
```

`n` is the unit normal in the planet's own frame (Y is the spin axis), `k` is
`(bands, turbulence, storm, seed)`, the colours are linear RGB and `t` is
seconds. It returns the unlit colour. No textures and no other functions are
needed: it carries its own noise.

```glsl
vec3 b3dGasGiantLit(vec3 albedo, float nDotL, float nDotV, vec3 haze)
```

lights it as a ball of gas: brightness falls away from the point under the
sun and again toward the limb, and a thin rim of `haze` shows on the day
side. A flat disc with a hard terminator reads as a coin; this is what makes
it a sphere. [gas-giant-material](/gas-giant-material/) wraps both for a mesh.
*/
/*{ "parent": "space", "order": 45 }*/
export const GAS_GIANTS = {
    jupiter: {
        bands: 14,
        turbulence: 1,
        storm: 0.9,
        colors: ['#e9dcc1', '#a9774c', '#b4502f'],
        seed: 1,
        rings: { inner: 1.4, outer: 1.8, opacity: 0.05, color: '#a08c78' },
    },
    // Saturn's bands are there, but only just: three close creams under haze.
    saturn: {
        bands: 20,
        turbulence: 0.3,
        storm: 0,
        colors: ['#e8d8ac', '#dcc896', '#cfb884'],
        seed: 2,
        rings: { inner: 1.25, outer: 2.3, opacity: 0.9, color: '#d8c8a0' },
    },
    uranus: {
        bands: 4,
        turbulence: 0.1,
        storm: 0,
        colors: ['#b4e6e8', '#a8dfe3', '#c8f0f0'],
        seed: 3,
        rings: { inner: 1.65, outer: 2.0, opacity: 0.1, color: '#8c98a0' },
    },
    neptune: {
        bands: 6,
        turbulence: 0.5,
        storm: 0.6,
        colors: ['#4a78dc', '#2c4fb8', '#dfe9ff'],
        seed: 4,
        rings: { inner: 1.7, outer: 2.5, opacity: 0.07, color: '#8090a8' },
    },
};
const HEX = /^#[0-9a-f]{6}$/i;
/**
 * A preset plus overrides. An unknown preset name is Jupiter, so a typo still
 * draws a planet; the sentinels (`0`, `-1`, `''`) mean "the preset's own".
 */
export function resolveGasGiant(preset, over = {}) {
    const base = GAS_GIANTS[String(preset).toLowerCase()] ?? GAS_GIANTS.jupiter;
    const given = Array.isArray(over.colors)
        ? over.colors
        : String(over.colors ?? '')
            .split(',')
            .map((c) => c.trim());
    const colors = base.colors.map((c, i) => HEX.test(given[i] ?? '') ? given[i].toLowerCase() : c);
    const num = (v, ok, fallback) => {
        const n = Number(v);
        return Number.isFinite(n) && ok(n) ? n : fallback;
    };
    return {
        bands: Math.min(40, num(over.bands, (n) => n > 0, base.bands)),
        turbulence: Math.min(1.5, num(over.turbulence, (n) => n >= 0, base.turbulence)),
        storm: Math.min(2, num(over.storm, (n) => n >= 0, base.storm)),
        colors,
        seed: num(over.seed, (n) => n > 0, base.seed),
        rings: { ...base.rings },
    };
}
/** `#rrggbb` (display) to linear-ish RGB 0…1, which is what the shader mixes in. */
export function gasGiantRgb(hex) {
    const h = HEX.test(hex) ? hex : '#888888';
    return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
/*
The noise is a hashed value noise, three octaves where the eye resolves them.
Sampled in 3D on the sphere itself, so there is no seam and no pinch at the
poles. The streaks come from squashing the sample space along the spin axis:
a blob of noise that is round there is long and thin on the planet.

The bands are a cosine of latitude, so the equator sits in a bright zone, and
latitude is bent first so that the stripes near the equator are the broad
ones, as they are on Jupiter and Saturn. The same wave is the wind: fastest
at the middle of a stripe and reversing at each edge. Each latitude is turned
about the axis by its own wind before the noise is read.

TURBULENCE GOES WHERE THE SHEAR IS. The wind reverses at a band's edge, so
that is where it tears: eddies are a warp that is the same in every
direction (so it curls rather than waves), gated to the band edges and to
patches along them. A warp applied everywhere made every band wavy. Inside
a band the texture is billow noise (the cloud deck's lesson: the absolute
value creases it into filaments), stretched along the wind.

THE STORM SPINS ITS POSITION, not an angle: the swirl turns the point about
the storm's centre, more toward the middle, and reads noise there. Reading
noise at atan's angle left a seam where the angle jumps a full turn. A storm
whose accent is brighter than the zones (Neptune's) is dark, with the bright
cloud at its rim; a darker accent (Jupiter's red) colours it.
*/
/*
THE LATTICE HASH SNAPS TO THE INTEGER FIRST (b3dGgHashL). A corner of the
noise lattice is reached from eight cells, as `i`, `i + (1,0,0)` and so on,
and a shader compiler is free to fold that constant offset into the hash's
own first multiply-and-add. The result differs in the last bit from the
neighbouring cell's, and the hash then multiplies that bit up into a
different number altogether: cells that disagree about a shared corner, so
the noise breaks into mismatched tiles along some edges. Seen on a Quest,
never on a desktop. A `floor` cannot be folded through, so every route to a
corner now hashes the identical value.
*/
export const GAS_GIANT_GLSL = `
float b3dGgHash(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float b3dGgHashL(vec3 p){return b3dGgHash(floor(p+0.5));}
float b3dGgNoise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
return mix(mix(mix(b3dGgHashL(i),b3dGgHashL(i+vec3(1.0,0.0,0.0)),f.x),mix(b3dGgHashL(i+vec3(0.0,1.0,0.0)),b3dGgHashL(i+vec3(1.0,1.0,0.0)),f.x),f.y),
mix(mix(b3dGgHashL(i+vec3(0.0,0.0,1.0)),b3dGgHashL(i+vec3(1.0,0.0,1.0)),f.x),mix(b3dGgHashL(i+vec3(0.0,1.0,1.0)),b3dGgHashL(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z);}
float b3dGgFbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<3;i++){s+=a*b3dGgNoise(p);p=p*2.03+vec3(7.1,3.3,5.7);a*=0.5;}return s/0.875;}
vec3 b3dGgTurn(vec3 n,float a){float c=cos(a);float s=sin(a);return vec3(n.x*c-n.z*s,n.y,n.x*s+n.z*c);}
vec3 b3dGasGiant(vec3 n,vec4 k,vec3 c0,vec3 c1,vec3 c2,float t){
float u=asin(clamp(n.y,-1.0,1.0))/1.5708;
float au=abs(u);
float e=sign(u)*mix(au,pow(au,1.6),0.65);
float ph=e*k.x*1.5708;
vec3 sd=vec3(k.w*13.1,k.w*7.7,k.w*3.3);
vec3 q=b3dGgTurn(n,t*0.012*cos(ph));
float w=b3dGgFbm(q*vec3(1.7,8.0,1.7)+sd)-0.5;
float wb=abs(b3dGgFbm(q*vec3(4.0,18.0,4.0)+sd*1.7+vec3(w*2.0))-0.5)*2.0;
float edge=1.0-abs(cos(ph));edge*=edge;
float eddy=edge*smoothstep(0.42,0.75,b3dGgNoise(q*vec3(2.5,5.0,2.5)+sd*0.7));
vec3 ep=q*10.0+sd;
vec3 ew=vec3(b3dGgNoise(ep),b3dGgNoise(ep+vec3(17.0)),b3dGgNoise(ep+vec3(31.0)))-0.5;
float cw=b3dGgFbm(ep+ew*2.5+sd*0.3)-0.5;
float v=e+k.y*(0.025*w+0.012*(wb-0.5)+eddy*cw*(2.4/k.x));
float tone=b3dGgNoise(vec3(floor(v*k.x*0.25+0.5)*3.7,k.w*5.1,1.3));
float band=0.5+0.5*cos(v*k.x*1.5708+(tone-0.5)*1.2);
vec3 col=mix(c1,c0,smoothstep(0.25,0.75,band));
col=mix(col,mix(c0,c2,0.5),(1.0-band)*tone*0.55);
col*=0.95+0.07*(wb-0.5)*k.y+0.08*(tone-0.5)+0.1*eddy*cw*k.y;
if(k.z>0.0){
float la=-0.36;
vec3 sn=b3dGgTurn(n,t*0.004+k.w*2.1);
float lon=atan(sn.z,sn.x);
vec2 d=vec2(lon*cos(la)*0.55,(asin(clamp(n.y,-1.0,1.0))-la))*(k.x/(3.2*k.z));
float r=length(d);
float sa=(1.0-smoothstep(0.0,1.1,r))*3.5-t*0.05;
vec2 dr=vec2(d.x*cos(sa)-d.y*sin(sa),d.x*sin(sa)+d.y*cos(sa));
float sw=b3dGgFbm(vec3(dr*3.0,k.w*1.7));
float m=1.0-smoothstep(0.55,1.0,r+0.3*(sw-0.5));
vec3 lw=vec3(0.3,0.59,0.11);
if(dot(c2,lw)<dot(c0,lw)){
col=mix(col,c2*(0.82+0.3*sw),m);
}else{
col=mix(col,c1*(0.5+0.25*sw),m);
float rim=smoothstep(0.55,0.85,r)*(1.0-smoothstep(0.85,1.25,r))*smoothstep(0.45,0.7,sw);
col=mix(col,c2,rim*0.8);
}
}
col=mix(col,col*0.6+c1*0.25,smoothstep(0.6,1.0,abs(u))*0.6);
return col;}
vec3 b3dGasGiantLit(vec3 alb,float nl,float nv,vec3 haze){
float l=max(nl,0.0);float e=clamp(nv,0.0,1.0);
float lit=pow(l,0.8)+0.05*smoothstep(-0.2,0.0,nl)*(1.0-l);
vec3 c=alb*lit*pow(e,0.35);
c+=haze*pow(1.0-e,2.5)*smoothstep(-0.15,0.35,nl)*0.45;
return c;}
`;
//# sourceMappingURL=gas-giant.js.map