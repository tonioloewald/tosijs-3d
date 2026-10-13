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
- climate: more cloud along the equator and the storm tracks at about 55
  degrees, less over the deserts at about 25.

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
float pcCover(vec3 d){
  float lat=asin(clamp(d.y,-1.0,1.0));
  vec3 sd=vec3(pcK.z*11.3,pcK.z*5.9,pcK.z*2.7);
  vec3 q=b3dGgTurn(d,pcK.y*0.012*cos(lat*3.0));
  vec3 sp=q*3.2+sd;
  vec3 w=vec3(b3dGgNoise(sp),b3dGgNoise(sp+vec3(17.0)),b3dGgNoise(sp+vec3(31.0)))-0.5;
  float f=0.62*b3dGgFbm((q+0.32*w)*4.6+sd)+0.38*b3dGgFbm((q+0.18*w)*13.0+sd*2.1);
  float clim=0.06*cos(lat*6.5);
  float th=mix(0.78,0.26,clamp(pcK.x,0.0,1.0));
  return smoothstep(th-0.07,th+0.09,f+clim);
}
void main(){
  vec3 d=normalize(vBody);
  vec3 n=normalize(vNormalW);
  vec3 l=pcLight.w>0.5?normalize(pcLight.xyz-vWorld):normalize(pcLight.xyz);
  float nl=dot(n,l);
  float c=pcCover(d);
  // Where the sun reaches this spot through cloud: read the field a little
  // way toward the sun (the part of the sun's direction along the ground).
  vec3 sb=normalize(pcSunBody);
  vec3 t=sb-d*dot(sb,d);
  float sh=pcCover(normalize(d+t*0.035))*smoothstep(-0.05,0.25,nl)*pcK.w;
  float lit=smoothstep(-0.12,0.3,nl)*(0.3+0.7*max(nl,0.0));
  // Premultiplied: cloud is added, and what is behind is dimmed by cloud
  // and by its shadow.
  vec3 rgb=pcColor*(lit+0.015)*c;
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
