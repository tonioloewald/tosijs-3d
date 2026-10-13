/*#
# gas-giant

**The cloud tops of a gas giant, as one shader function.** Banded, sheared by
winds that alternate direction from belt to belt, with a long-lived storm.
It colours a point on a sphere, so the same code draws a giant hanging in a
moon's sky ([`<tosi-b3d-moon gas="jupiter">`](/b3d-moon/)) and one you orbit.

It is the [cloud deck](/b3d-cloud-deck/)'s idea turned on its side: a noise
field advected by wind. There the wind blows across a plane; here each
latitude has its own wind, which is what draws the bands out into streaks.

## What the numbers mean

| | |
| --- | --- |
| `bands` | How many light and dark stripes from pole to pole. Jupiter is about 12, Neptune 5 |
| `turbulence` | How far the edges of the bands are torn, `0…1`. 0 is ruled lines; 1 is Jupiter |
| `storm` | Size of the great storm, `0…1` of a band's width. 0 is none |
| `colors` | Three: the bright zones, the dark belts, and the accent (the storm, the poles) |
| `seed` | A different planet with the same look |

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
seconds. It returns the unlit colour; lighting is the caller's. No textures
and no other functions are needed: it carries its own noise.
*/
/*{ "parent": "space", "order": 45 }*/

export interface GasGiantLook {
  /** Stripes from pole to pole. */
  bands: number
  /** How torn the band edges are, 0…1. */
  turbulence: number
  /** Size of the great storm, 0 = none. */
  storm: number
  /** Zones, belts, accent: three `#rrggbb`. */
  colors: [string, string, string]
  seed: number
}

export const GAS_GIANTS: Record<string, GasGiantLook> = {
  jupiter: {
    bands: 12,
    turbulence: 1,
    storm: 0.9,
    colors: ['#e9dcc1', '#a9774c', '#b4502f'],
    seed: 1,
  },
  saturn: {
    bands: 16,
    turbulence: 0.35,
    storm: 0,
    colors: ['#ecdcae', '#cdae72', '#b99a62'],
    seed: 2,
  },
  uranus: {
    bands: 4,
    turbulence: 0.15,
    storm: 0,
    colors: ['#b4e6e8', '#9ad6dc', '#c8f0f0'],
    seed: 3,
  },
  neptune: {
    bands: 5,
    turbulence: 0.5,
    storm: 0.6,
    colors: ['#4a78dc', '#2c4fb8', '#dfe9ff'],
    seed: 4,
  },
}

export interface GasGiantOverrides {
  /** `> 0` replaces the preset's. */
  bands?: number
  /** `>= 0` replaces the preset's. */
  turbulence?: number
  /** `>= 0` replaces the preset's. */
  storm?: number
  /** Up to three colours, comma separated or an array; blanks keep the preset's. */
  colors?: string | string[]
  /** `> 0` replaces the preset's. */
  seed?: number
}

const HEX = /^#[0-9a-f]{6}$/i

/**
 * A preset plus overrides. An unknown preset name is Jupiter, so a typo still
 * draws a planet; the sentinels (`0`, `-1`, `''`) mean "the preset's own".
 */
export function resolveGasGiant(
  preset: string,
  over: GasGiantOverrides = {}
): GasGiantLook {
  const base = GAS_GIANTS[String(preset).toLowerCase()] ?? GAS_GIANTS.jupiter
  const given = Array.isArray(over.colors)
    ? over.colors
    : String(over.colors ?? '')
        .split(',')
        .map((c) => c.trim())
  const colors = base.colors.map((c, i) =>
    HEX.test(given[i] ?? '') ? (given[i] as string).toLowerCase() : c
  ) as [string, string, string]
  const num = (v: unknown, ok: (n: number) => boolean, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) && ok(n) ? n : fallback
  }
  return {
    bands: Math.min(
      40,
      num(over.bands, (n) => n > 0, base.bands)
    ),
    turbulence: Math.min(
      1.5,
      num(over.turbulence, (n) => n >= 0, base.turbulence)
    ),
    storm: Math.min(
      2,
      num(over.storm, (n) => n >= 0, base.storm)
    ),
    colors,
    seed: num(over.seed, (n) => n > 0, base.seed),
  }
}

/** `#rrggbb` (display) to linear-ish RGB 0…1, which is what the shader mixes in. */
export function gasGiantRgb(hex: string): [number, number, number] {
  const h = HEX.test(hex) ? hex : '#888888'
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number
  ]
}

/*
The noise is a hashed value noise, three octaves where the eye resolves them.
Sampled in 3D on the sphere itself, so there is no seam and no pinch at the
poles. The streaks come from squashing the sample space along the spin axis:
a blob of noise that is round there is long and thin on the planet.

The winds: `sin(latitude * bands * pi)` is the band pattern, and the same
wave a quarter turn on is the wind (fastest at the middle of a band, reversing
at each edge), which is the arrangement on Jupiter. Each latitude is turned
about the axis by its own wind before the noise is read.
*/
export const GAS_GIANT_GLSL = `
float b3dGgHash(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float b3dGgNoise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
return mix(mix(mix(b3dGgHash(i),b3dGgHash(i+vec3(1.0,0.0,0.0)),f.x),mix(b3dGgHash(i+vec3(0.0,1.0,0.0)),b3dGgHash(i+vec3(1.0,1.0,0.0)),f.x),f.y),
mix(mix(b3dGgHash(i+vec3(0.0,0.0,1.0)),b3dGgHash(i+vec3(1.0,0.0,1.0)),f.x),mix(b3dGgHash(i+vec3(0.0,1.0,1.0)),b3dGgHash(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z);}
float b3dGgFbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<3;i++){s+=a*b3dGgNoise(p);p=p*2.03+vec3(7.1,3.3,5.7);a*=0.5;}return s/0.875;}
vec3 b3dGgTurn(vec3 n,float a){float c=cos(a);float s=sin(a);return vec3(n.x*c-n.z*s,n.y,n.x*s+n.z*c);}
vec3 b3dGasGiant(vec3 n,vec4 k,vec3 c0,vec3 c1,vec3 c2,float t){
float u=asin(clamp(n.y,-1.0,1.0))/1.5708;
float ph=u*k.x*3.14159;
vec3 sd=vec3(k.w*13.1,k.w*7.7,k.w*3.3);
vec3 q=b3dGgTurn(n,t*0.012*cos(ph));
float w=b3dGgFbm(q*vec3(1.7,8.0,1.7)+sd)-0.5;
float w2=b3dGgFbm(q*vec3(5.0,34.0,5.0)+sd*1.7+vec3(w*2.0))-0.5;
float v=u+k.y*(0.05*w+0.022*w2);
float tone=b3dGgNoise(vec3(floor(v*k.x*0.5+0.5)*3.7,k.w*5.1,1.3));
float band=0.5+0.5*sin(v*k.x*3.14159+(tone-0.5)*1.4);
vec3 col=mix(c1,c0,smoothstep(0.25,0.75,band));
col=mix(col,mix(c0,c2,0.5),(1.0-band)*tone*0.55);
col*=0.93+0.22*w2*k.y+0.08*(tone-0.5);
if(k.z>0.0){
float la=-0.36;
vec3 sn=b3dGgTurn(n,t*0.004+k.w*2.1);
float lon=atan(sn.z,sn.x);
vec2 d=vec2(lon*cos(la)*0.55,(asin(clamp(n.y,-1.0,1.0))-la))*(k.x/(3.2*k.z));
float r=length(d);
float sw=b3dGgNoise(vec3(atan(d.y,d.x)*1.5+r*9.0-t*0.05,r*5.0,k.w));
float m=1.0-smoothstep(0.55,1.0,r+0.12*(sw-0.5));
col=mix(col,c2*(0.82+0.3*sw),m);
}
col=mix(col,mix(c1,c2,0.35)*0.72,smoothstep(0.72,1.0,abs(u)));
return col;}
`
