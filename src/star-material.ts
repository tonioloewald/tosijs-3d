/*
A STAR'S SURFACE, as one material for a sphere. What makes a star read as a
ball rather than a white disc is LIMB DARKENING: toward its edge you look
through the cooler, higher layers, so it dims and reddens. Under that, a
seething granulation (convection cells, slowly moving) and a few sunspots,
from the gas giant's noise (no textures). Unlit: it is the light.

ACTIVITY (prominences and flares): a few ACTIVE REGIONS, fixed points on
the star in the mid-latitude bands where real sunspots gather, turning with
it. Over the edge of the disc each one is a PROMINENCE: a glowing loop of
filaments arching out of the limb (drawn in the corona shell, so no new
mesh), seen only while its region is near the edge. Now and then a region
FLARES: its loop swells and brightens for a few seconds, and a bright patch
flashes on the disc there. One GLSL definition of the regions and their
timing serves both shaders, so the patch and the loop agree. `activity` 0
turns it all off.

Used by <tosi-b3d-star> and the star system's star.
*/

import * as BABYLON from '@babylonjs/core'
import { GAS_GIANT_GLSL } from './gas-giant.js'
import { sceneSeconds } from './b3d-utils.js'

/*
THE ACTIVE REGIONS, shared by the surface and the corona: where each is (a
direction in the star's own frame) and how much it is flaring now (0 most of
the time; a quick rise and a slower fall every half minute or so, each region
on its own period so they never fall into step).
*/
const STAR_ACTIVE_GLSL = `
#define B3D_REGIONS 7
float b3dStH(float n, float seed){return fract(sin(n*127.1+seed*311.7)*43758.5453);}
vec3 b3dStRegion(int k, float seed){
  float f=float(k);
  float lat=(0.17+0.45*b3dStH(f,seed))*(b3dStH(f+9.0,seed)<0.5?-1.0:1.0);
  float lon=6.2831853*b3dStH(f+3.0,seed);
  float c=cos(lat);
  return vec3(c*cos(lon),sin(lat),c*sin(lon));
}
float b3dStFlare(int k, float seed, float t){
  float f=float(k);
  float period=22.0+30.0*b3dStH(f+5.0,seed);
  float ph=fract(t/period+b3dStH(f+7.0,seed));
  return smoothstep(0.0,0.04,ph)*(1.0-smoothstep(0.04,0.3,ph));
}
`

export interface StarMaterialOptions {
  /** The star's colour, 0…1. */
  rgb: [number, number, number]
  seed?: number
  /** Overall brightness; 1 keeps the disc's centre just under white. */
  glow?: number
  /** 0…1: how strong the granulation and spots are. */
  detail?: number
  /** 0…1: prominences and flares (0 none). Default 0.6. */
  activity?: number
}

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocal;
void main(){
  gl_Position=worldViewProjection*vec4(position,1.0);
  vPosW=(world*vec4(position,1.0)).xyz;
  vNormalW=normalize(mat3(world)*normal);
  vLocal=position;
}
`

const FRAGMENT = `
precision highp float;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocal;
uniform vec3 starColor;
uniform vec3 cameraPosition;
uniform vec4 starK; // time, seed, glow, detail
uniform float starActivity;
${GAS_GIANT_GLSL}
${STAR_ACTIVE_GLSL}
void main(){
  vec3 n=normalize(vNormalW);
  vec3 v=normalize(cameraPosition-vPosW);
  float mu=clamp(dot(n,v),0.0,1.0);
  vec3 d=normalize(vLocal);
  float t=starK.x;
  vec3 sd=vec3(starK.y*7.1,starK.y*3.3,starK.y*5.7);
  // Granulation: small cells boiling slowly, two scales.
  float g=b3dGgFbm(d*28.0+sd+vec3(0.0,t*0.03,t*0.02));
  float g2=b3dGgNoise(d*90.0+sd*1.3+vec3(t*0.1));
  float gran=1.0+starK.w*((g-0.5)*0.5+(g2-0.5)*0.18);
  // Sunspots: sparse, dark, away from the poles.
  float lat=abs(d.y);
  float sp=smoothstep(0.66,0.74,b3dGgFbm(d*5.0+sd*2.0))*(1.0-smoothstep(0.35,0.6,lat));
  gran*=1.0-0.75*sp*starK.w;
  // Limb darkening (the Sun's, roughly), and the edge warms. Gently: the
  // middle is kept under white so it shades off rather than sitting as a
  // flat clipped disc, and the warming spreads over most of the radius.
  float limb=1.0-0.5*(1.0-mu)-0.15*(1.0-mu*mu);
  // Only a warm star reddens at its edge; a hot one just darkens (warmed,
  // a blue-white star went brown).
  float warm=clamp(starColor.r-starColor.b+0.2,0.0,1.0);
  vec3 edge=starColor*mix(vec3(0.92),vec3(1.0,0.8,0.62),warm);
  vec3 col=mix(edge,starColor,smoothstep(0.0,0.9,mu));
  // BLINDING IN THE MIDDLE, and getting there gradually: the disc is
  // driven well past white, and the colour blends into white as it goes
  // over (rather than clipping, which was a flat disc with a sudden edge),
  // so the star keeps its colour toward the limb and burns white at the
  // centre.
  vec3 c=col*limb*gran*starK.z*1.75;
  // A FLARE on the disc: a brief bright patch at a region while it flares.
  for(int k=0;k<B3D_REGIONS;k++){
    float fl=b3dStFlare(k,starK.y,t);
    if(fl<=0.001) continue;
    vec3 r=b3dStRegion(k,starK.y);
    float near=exp(-dot(d-r,d-r)/0.0025);
    c+=vec3(1.0,0.95,0.85)*near*fl*2.5*starActivity;
  }
  float m=max(max(c.r,c.g),c.b);
  c=mix(min(c,vec3(1.0)),vec3(1.0),smoothstep(0.85,1.75,m));
  gl_FragColor=vec4(c,1.0);
}
`

let registered = false

export function createStarMaterial(
  scene: BABYLON.Scene,
  options: StarMaterialOptions
): BABYLON.ShaderMaterial {
  if (!registered) {
    BABYLON.Effect.ShadersStore['b3dStarSurfaceVertexShader'] = VERTEX
    BABYLON.Effect.ShadersStore['b3dStarSurfaceFragmentShader'] = FRAGMENT
    registered = true
  }
  const mat = new BABYLON.ShaderMaterial(
    'star-surface',
    scene,
    { vertex: 'b3dStarSurface', fragment: 'b3dStarSurface' },
    {
      attributes: ['position', 'normal'],
      uniforms: [
        'world',
        'worldViewProjection',
        'starColor',
        'cameraPosition',
        'starK',
        'starActivity',
      ],
    }
  )
  const [r, g, b] = options.rgb
  mat.setVector3('starColor', new BABYLON.Vector3(r, g, b))
  const k = new BABYLON.Vector4(
    0,
    options.seed ?? 1,
    options.glow ?? 1,
    options.detail ?? 0.6
  )
  mat.setFloat('starActivity', options.activity ?? 0.6)
  mat.onBind = () => {
    const cam = scene.activeCamera
    if (cam) mat.setVector3('cameraPosition', cam.globalPosition)
    k.x = sceneSeconds(scene)
    mat.setVector4('starK', k)
  }
  return mat
}

/*
THE CORONA, a shell around the star, shared by <tosi-b3d-star> and the star
system (it was two copies of one shader). Brightest at the star's edge
(`coronaLimb`: where the limb falls on the shell), fading outward, faint over
the disc. And the PROMINENCES: for each active region near the edge, a loop
of filaments over the limb, in the sky plane around the disc. Worked out
per fragment from the shell point's projection: its distance from the
star's centre in star radii (1 at the limb) and its angle round the disc.
*/
const CORONA_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 worldViewProjection;
uniform mat4 world;
varying vec3 vNormalW;
varying vec3 vPositionW;
void main() {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vPositionW = (world * vec4(position, 1.0)).xyz;
  vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
}
`

const CORONA_FRAGMENT = `
precision highp float;
uniform mat4 world;
uniform vec3 cameraPosition;
uniform vec3 coronaColor;
uniform float coronaLimb;
// star radius (local), shell radius (local), time, seed
uniform vec4 coronaK;
uniform float starActivity;
varying vec3 vNormalW;
varying vec3 vPositionW;
${GAS_GIANT_GLSL}
${STAR_ACTIVE_GLSL}
void main() {
  vec3 viewDir = normalize(cameraPosition - vPositionW);
  float facing = abs(dot(viewDir, vNormalW));
  float glow = 0.5 * (facing < coronaLimb
    ? pow(facing / coronaLimb, 2.5)
    : mix(1.0, 0.08, smoothstep(coronaLimb, 1.0, facing)));
  vec3 col = coronaColor * glow;

  float prom = 0.0;
  if (starActivity > 0.0) {
    vec3 c = world[3].xyz;
    float scale = length(world[0].xyz);
    float R = coronaK.x * scale;
    float room = coronaK.y / coronaK.x - 1.0;
    float t = coronaK.z;
    vec3 v = normalize(cameraPosition - c);
    // Where this PIXEL is, round the disc: the closest its ray comes to the
    // star's centre (the impact parameter), in star radii. That is exactly 1
    // at the visible edge from any distance; the shell point's own distance
    // from the axis is not, in perspective, and put the loops' feet behind
    // the disc so they floated free as crescents.
    vec3 ray = normalize(vPositionW - cameraPosition);
    vec3 q = cameraPosition + ray * dot(c - cameraPosition, ray) - c;
    float rho = length(q) / R;
    vec3 e = q / max(length(q), 1e-6);
    // Only off the disc: over it, a prominence is a dark filament, not a glow.
    float off = smoothstep(0.99, 1.01, rho);
    mat3 rot = mat3(world) / scale;
    for (int k = 0; k < B3D_REGIONS; k++) {
      vec3 a = normalize(rot * b3dStRegion(k, coronaK.w));
      float side = dot(a, v);
      // Seen while near the edge (either side of it: a loop over the far
      // limb still shows its top).
      float edge = smoothstep(0.55, 0.85, 1.0 - abs(side));
      if (edge <= 0.0) continue;
      vec3 ap = a - v * side;
      vec3 ae = ap / max(length(ap), 1e-6);
      float dth = atan(dot(cross(ae, e), v), dot(ae, e));
      float fk = float(k);
      float fl = b3dStFlare(k, coronaK.w, t);
      float wth = 0.07 + 0.08 * b3dStH(fk + 11.0, coronaK.w);
      float u = dth / wth;
      if (abs(u) >= 1.4) continue;
      // Heights vary a lot: most loops low, the odd one standing tall (the
      // cube of a hash leans small), and a flare swells any of them.
      float tall = b3dStH(fk + 13.0, coronaK.w);
      float h = min(room * 0.95, (0.05 + 0.3 * tall * tall * tall) * (1.0 + 1.4 * fl));
      // The loop is half an ellipse standing on the limb, wth wide and h
      // tall; the distance is to the ELLIPSE, not straight up from the limb
      // (measured upward, the steep legs had no thickness and the loops
      // floated free of the star as crescents).
      float y = rho - 1.0;
      float arc = abs(u) < 1.0 ? h * sqrt(1.0 - u * u) : 0.0;
      float thick = 0.03 + 0.02 * fl;
      float dist = y < 0.0 ? 1.0 : (length(vec2(dth / wth, y / h)) - 1.0) * min(wth, h);
      // Filaments: streaks along the loop that drift and twist.
      float fil = 0.45 + 0.9 * b3dGgNoise(vec3(u * 7.0 + fk * 3.1, (rho - 1.0) * 70.0, t * 0.25 + fk));
      float loop = exp(-(dist * dist) / (thick * thick)) * fil;
      // Plasma hanging under the arch, fainter.
      float under = (rho - 1.0) < arc ? 0.4 * smoothstep(0.0, 0.4, 1.0 - abs(u)) * (0.6 + 0.6 * b3dGgNoise(vec3(u * 4.0, (rho - 1.0) * 25.0, t * 0.2 + fk * 2.0))) : 0.0;
      prom += (loop + under) * edge * (1.0 + 1.6 * fl);
    }
    prom *= off * starActivity;
  }
  // Prominences glow hotter and pinker than the corona (hydrogen's red).
  col += mix(coronaColor * 1.6, vec3(1.0, 0.45, 0.3), 0.5) * prom * 1.8;
  float a = clamp(glow + prom, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`

let coronaRegistered = false

export interface CoronaMaterialOptions {
  /** The corona's colour (already scaled for brightness). */
  rgb: [number, number, number]
  /** The star's radius and the shell's, in the shell mesh's own units. */
  starRadius: number
  shellRadius: number
  seed?: number
  /** 0…1: prominences and flares; match the star's. Default 0.6. */
  activity?: number
}

/** The corona shell's material: the glow, and the prominences in it. */
export function createCoronaMaterial(
  scene: BABYLON.Scene,
  options: CoronaMaterialOptions
): BABYLON.ShaderMaterial {
  if (!coronaRegistered) {
    BABYLON.Effect.ShadersStore['b3dStarCoronaVertexShader'] = CORONA_VERTEX
    BABYLON.Effect.ShadersStore['b3dStarCoronaFragmentShader'] = CORONA_FRAGMENT
    coronaRegistered = true
  }
  const mat = new BABYLON.ShaderMaterial(
    'star-corona',
    scene,
    { vertex: 'b3dStarCorona', fragment: 'b3dStarCorona' },
    {
      attributes: ['position', 'normal'],
      uniforms: [
        'worldViewProjection',
        'world',
        'cameraPosition',
        'coronaColor',
        'coronaLimb',
        'coronaK',
        'starActivity',
      ],
      needAlphaBlending: true,
    }
  )
  const [r, g, b] = options.rgb
  mat.setVector3('coronaColor', new BABYLON.Vector3(r, g, b))
  mat.setFloat(
    'coronaLimb',
    Math.sqrt(Math.max(0.01, 1 - (options.starRadius / options.shellRadius) ** 2))
  )
  mat.setFloat('starActivity', options.activity ?? 0.6)
  const k = new BABYLON.Vector4(options.starRadius, options.shellRadius, 0, options.seed ?? 1)
  mat.backFaceCulling = false
  mat.alphaMode = BABYLON.Constants.ALPHA_ADD
  mat.disableDepthWrite = true
  mat.onBind = () => {
    const cam = scene.activeCamera
    if (cam) mat.setVector3('cameraPosition', cam.globalPosition)
    k.z = sceneSeconds(scene)
    mat.setVector4('coronaK', k)
  }
  return mat
}
