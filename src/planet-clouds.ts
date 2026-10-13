/*
A planet's weather seen from orbit: a shell of cloud just above the ground and
inside the air. Babylon-side; `<tosi-b3d-planet clouds="0.5">` uses it.

The field is the cloud deck's idea on a sphere: fBm with ONE coverage dial
that slides a threshold through it, advected by wind. Read in 3D at the point
itself, in the planet's own frame, so there is no pole and no seam and the
weather turns with the world. Three things make it read as weather and not
as marble:

- the winds reverse with latitude (trades one way, westerlies the other), so
  systems shear into streaks;
- the point is pushed about by a coarser noise before the cloud is read, which
  curls fronts into commas;
- climate: weather lives in belts. A thin band of storms near the equator,
  clear skies over the deserts at about 25 degrees, and a broad belt of
  travelling systems around 52 degrees in each hemisphere;
- cyclones: in those belts the field is wound about scattered centres, which
  draws cloud into the comma of a real depression;
- relief: the field is the cloud's depth, and its slope toward the sun
  shades the tops, which is the texture a deck has.

And the SHADOW, which is most of what makes cloud sit above ground: the shell
also darkens the surface where cloud stands between it and the sun, by reading
the same field a little way toward the sun.
*/
import * as BABYLON from '@babylonjs/core'
import { GAS_GIANT_GLSL } from './gas-giant.js'
import { sceneLight } from './gas-giant-material.js'

const NAME = 'b3dPlanetClouds'

function registerShader(): void {
  const store = BABYLON.Effect.ShadersStore
  if (store[`${NAME}VertexShader`]) return
  store[`${NAME}VertexShader`] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vBody=position;
  vec4 w=world*vec4(position,1.0);
  vWorld=w.xyz;
  vNormalW=normalize(mat3(world)*normal);
  gl_Position=worldViewProjection*vec4(position,1.0);
}`
  store[`${NAME}FragmentShader`] = `
precision highp float;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
uniform vec4 pcLight;
uniform vec3 pcSunBody;
uniform vec3 pcColor;
uniform vec4 pcK;
${GAS_GIANT_GLSL}
// Rodrigues: turn p about a unit axis.
vec3 pcAbout(vec3 p,vec3 ax,float a){float c=cos(a);float s=sin(a);return p*c+cross(ax,p)*s+ax*dot(ax,p)*(1.0-c);}
// WHERE WEATHER LIVES, by latitude (0…1): a thin band of storms near the
// equator, clear skies over the deserts at about 25 degrees, and a broad
// belt of travelling systems around 52 degrees in each hemisphere.
float pcBelt(float latDeg){
  float a=abs(latDeg);
  float itcz=exp(-pow((latDeg-6.0)/7.0,2.0));
  float mid=exp(-pow((a-52.0)/15.0,2.0));
  return clamp(0.85*itcz+mid+0.45*smoothstep(66.0,86.0,a),0.0,1.0);
}
// The cloud's DEPTH at a point, before the coverage dial cuts it.
float pcField(vec3 d){
  float latDeg=asin(clamp(d.y,-1.0,1.0))*57.29578;
  float lat=latDeg*0.0174533;
  vec3 sd=vec3(pcK.z*11.3,pcK.z*5.9,pcK.z*2.7);
  vec3 q=b3dGgTurn(d,pcK.y*0.012*cos(lat*3.0));
  /*
  CYCLONES. Space is cut into cells about 16 degrees across, each with a
  centre; near its centre the sky is WOUND about it, anticlockwise in the
  north and clockwise in the south, more tightly toward the middle. Winding
  a field of cloud is what draws it into the comma of a real depression.
  The winding fades to nothing before a cell's edge, so cells do not show.
  */
  vec3 cq=q*3.6+sd;
  vec3 g=floor(cq);
  vec3 jit=vec3(b3dGgHash(g),b3dGgHash(g+vec3(7.0)),b3dGgHash(g+vec3(13.0)))-0.5;
  vec3 ctr=(g+0.5+0.24*jit-sd)/3.6;
  float rr=length(q-ctr)*3.6;
  float wind=1.0-smoothstep(0.0,0.42,rr);
  float mid=exp(-pow((abs(latDeg)-52.0)/17.0,2.0));
  float twist=2.6*wind*wind*(0.25+0.75*mid)*(0.4+0.9*b3dGgHash(g+vec3(3.0)));
  q=pcAbout(q,normalize(ctr),twist*(d.y>=0.0?1.0:-1.0));
  // Big systems, then two finer layers for the texture a deck has close to.
  float f=0.46*b3dGgFbm(q*7.5+sd)
    +0.32*b3dGgFbm(q*22.0+sd*2.1)
    +0.22*b3dGgFbm(q*60.0+sd*3.3);
  return f+0.24*(pcBelt(latDeg)-0.45);
}
float pcCut(float f){
  float th=mix(0.74,0.3,clamp(pcK.x,0.0,1.0));
  return smoothstep(th-0.05,th+0.1,f);
}
void main(){
  vec3 d=normalize(vBody);
  vec3 n=normalize(vNormalW);
  vec3 l=pcLight.w>0.5?normalize(pcLight.xyz-vWorld):normalize(pcLight.xyz);
  float nl=dot(n,l);
  float f=pcField(d);
  float c=pcCut(f);
  // The part of the sun's direction that lies along the ground here.
  vec3 sb=normalize(pcSunBody);
  vec3 t=sb-d*dot(sb,d);
  // RELIEF. The field is the cloud's depth, so its slope toward the sun is
  // which way the cloud top faces: rising toward the sun, this side is in
  // its own shade; falling, it is a lit flank. That is what gives a deck its
  // texture, and without it cloud is a white stencil.
  float toward=pcField(normalize(d+t*0.010));
  float relief=clamp(0.5+(f-toward)*7.0,0.0,1.0);
  // Thick cloud is bright on top; thin cloud is a grey veil.
  float body=mix(0.84,1.0,smoothstep(0.0,0.25,f-mix(0.74,0.3,clamp(pcK.x,0.0,1.0))));
  // Where the sun reaches the GROUND through cloud: the same field, further
  // toward the sun.
  float sh=pcCut(pcField(normalize(d+t*0.035)))*smoothstep(-0.05,0.25,nl)*pcK.w;
  // Cloud scatters light forward and sideways, so it stays bright well
  // toward the terminator where bare ground has already dimmed.
  float lit=smoothstep(-0.12,0.3,nl)*(0.5+0.5*max(nl,0.0));
  // Premultiplied: cloud is added, and what is behind is dimmed by cloud
  // and by its shadow.
  vec3 rgb=pcColor*(lit*1.3*body*mix(0.78,1.12,relief)+0.015)*c;
  float a=c+(1.0-c)*sh;
  gl_FragColor=vec4(rgb,a);
}`
}

export interface PlanetCloudOptions {
  /** 0…1: how much of the sky is cloud. */
  coverage: number
  /** `#rrggbb` where lit. */
  color?: BABYLON.Color3
  /** How fast the weather moves; 1 is the default, 0 is still. */
  speed?: number
  seed?: number
  /** How dark the ground is under cloud, 0…1. Default 0.45. */
  shadow?: number
}

/** A cloud shell of `radius` (in the parent's units), parented to `parent`. */
export function createPlanetClouds(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  radius: number,
  options: PlanetCloudOptions
): BABYLON.Mesh {
  registerShader()
  const mesh = BABYLON.MeshBuilder.CreateSphere(
    'planet-clouds',
    { diameter: radius * 2, segments: 48 },
    scene
  )
  const mat = new BABYLON.ShaderMaterial(
    'planet-clouds',
    scene,
    { vertex: NAME, fragment: NAME },
    {
      attributes: ['position', 'normal'],
      uniforms: [
        'world',
        'worldViewProjection',
        'pcLight',
        'pcSunBody',
        'pcColor',
        'pcK',
      ],
      needAlphaBlending: true,
    }
  )
  const color = options.color ?? new BABYLON.Color3(1, 1, 1)
  mat.setVector3('pcColor', new BABYLON.Vector3(color.r, color.g, color.b))
  mat.alphaMode = BABYLON.Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true
  mat.backFaceCulling = true
  const light = new BABYLON.Vector4(0, 1, 0, 0)
  const toSun = new BABYLON.Vector3()
  const inv = new BABYLON.Matrix()
  const speed = options.speed ?? 1
  mat.onBind = () => {
    sceneLight(scene, light)
    mat.setVector4('pcLight', light)
    // The sun's direction in the planet's own frame, for the shadow.
    mesh.getWorldMatrix().invertToRef(inv)
    if (light.w > 0.5) {
      toSun.set(light.x, light.y, light.z)
      toSun.subtractInPlace(mesh.getAbsolutePosition())
    } else toSun.set(light.x, light.y, light.z)
    BABYLON.Vector3.TransformNormalToRef(toSun, inv, toSun)
    mat.setVector3('pcSunBody', toSun)
    mat.setVector4(
      'pcK',
      new BABYLON.Vector4(
        options.coverage,
        performance.now() * 0.001 * speed,
        options.seed ?? 1,
        options.shadow ?? 0.45
      )
    )
  }
  mesh.material = mat
  mesh.parent = parent
  mesh.isPickable = false
  return mesh
}
