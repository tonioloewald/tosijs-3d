/*
ONE MESH, LAND AND SEA. The material for a planet whose ground and water are
one sphere, told apart per pixel by height (board #3271).

The mesh holds every vertex that is under water AT sea level, and carries each
vertex's true height as data. So the shader knows, at every pixel, how far
above or below the sea it is:

- ABOVE: land. The colour map if there is one; else a small set of rules by
  latitude, height and a moisture noise (ice, rock, forest, grass, desert).
- BELOW: water. Pale in the shallows and dark in the deep, and it GLINTS: the
  sun's reflection, which land does not have. The glint is broken up by fine
  noise standing in for waves, because a real sea's glint is not a mirror's
  disc but a field of sparkle that is wider and rougher toward its edge.
- THE COAST is where the interpolated height crosses zero, which happens
  INSIDE a triangle: a smooth line however coarse the mesh. (With a sea
  sphere the coast was wherever the ground poked through, as jagged as the
  mesh.)

It lights itself from the scene's sun or star, like the gas giant and the
cloud shell, and keeps the night side dim, not black.
*/
import * as BABYLON from '@babylonjs/core'
import { GAS_GIANT_GLSL } from './gas-giant.js'
import { sceneLight } from './gas-giant-material.js'

const NAME = 'b3dPlanetSurface'

function registerShader(): void {
  const store = BABYLON.Effect.ShadersStore
  if (store[`${NAME}VertexShader`]) return
  store[`${NAME}VertexShader`] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vHeight;
void main(){
  vBody=position;
  vHeight=uv.x;
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
varying float vHeight;
uniform sampler2D psColor;
uniform vec4 psLight;
uniform vec3 psEye;
uniform vec4 psK;
uniform vec4 psSea;
uniform mat4 world;
${GAS_GIANT_GLSL}
void main(){
  vec3 d=normalize(vBody);
  vec3 n=normalize(vNormalW);
  vec3 l=psLight.w>0.5?normalize(psLight.xyz-vWorld):normalize(psLight.xyz);
  vec3 v=normalize(psEye-vWorld);
  float nl=dot(n,l);
  // How much of this pixel is sea: the height crossing zero, softened over
  // about a pixel. psSea.x is 0 for a world with no sea at all.
  float edge=max(fwidth(vHeight)*0.9,1e-5);
  float sea=psSea.x*(1.0-smoothstep(-edge,edge,vHeight));
  float lat=asin(clamp(d.y,-1.0,1.0));

  // --- land ---------------------------------------------------------------
  vec3 land;
  if(psK.w>0.5){
    vec2 uv=vec2(atan(d.z,d.x)/6.2831853+0.5,1.0-acos(clamp(d.y,-1.0,1.0))/3.14159265);
    land=texture2D(psColor,uv).rgb;
  }else{
    float alt=clamp(vHeight/max(psK.x,1e-4),0.0,1.0);
    float wet=b3dGgFbm(d*3.1+vec3(psK.z))*0.7+b3dGgNoise(d*11.0)*0.3;
    float temp=1.0-abs(lat)/1.45-alt*0.55+(b3dGgNoise(d*5.0+vec3(3.0))-0.5)*0.18;
    vec3 desert=vec3(0.76,0.66,0.44);
    vec3 grass=vec3(0.35,0.5,0.24);
    vec3 forest=vec3(0.13,0.3,0.14);
    vec3 tundra=vec3(0.45,0.44,0.36);
    vec3 rock=vec3(0.42,0.39,0.36);
    land=mix(desert,mix(grass,forest,smoothstep(0.5,0.72,wet)),smoothstep(0.34,0.52,wet));
    land=mix(tundra,land,smoothstep(0.22,0.42,temp));
    land=mix(land,rock,smoothstep(0.55,0.8,alt));
    land=mix(vec3(0.93,0.95,0.97),land,smoothstep(0.1,0.2,temp));
    land=mix(land,vec3(0.8,0.74,0.56),(1.0-smoothstep(0.0,0.035,alt))*0.7);
  }

  // --- water --------------------------------------------------------------
  float depth=clamp(-vHeight/max(psK.y,1e-4),0.0,1.0);
  vec3 water=mix(vec3(0.09,0.42,0.5),vec3(0.012,0.06,0.2),1.0-exp(-depth*3.2));
  // With a colour map the map's own sea colour is the truth; deepen it only.
  if(psK.w>0.5)water=land*mix(1.0,0.82,depth);
  // Sea ice toward the poles.
  float ice=psSea.z*smoothstep(1.02,1.2,abs(lat)+(b3dGgNoise(d*9.0)-0.5)*0.12);
  water=mix(water,vec3(0.86,0.9,0.94),ice);

  vec3 alb=mix(land,water,sea);
  float lit=smoothstep(-0.05,0.25,nl)*(0.25+0.75*max(nl,0.0));
  vec3 col=alb*(lit+0.09);

  /*
  THE GLINT. A mirror ball would show the sun as one small disc. A sea is a
  mirror broken into waves far too small to see, each tilted a little, so
  what shows is a patch of sparkle: bright and tight at its heart, wide and
  thin around it. The tilts are fine noise in the planet's own frame (so the
  glint is fixed to no patch of water and slides across the sea as you move)
  drifting slowly so that it shimmers.
  */
  if(sea>0.0&&psSea.y>0.0){
    vec3 up=normalize(mat3(world)*d);
    float t=psSea.w;
    vec3 wv=vec3(b3dGgNoise(d*420.0+vec3(t*0.7,0.0,0.0)),b3dGgNoise(d*420.0+vec3(31.0,t*0.6,0.0)),b3dGgNoise(d*420.0+vec3(0.0,57.0,t*0.5)))-0.5;
    vec3 wv2=vec3(b3dGgNoise(d*95.0+vec3(t*0.2)),b3dGgNoise(d*95.0+vec3(17.0+t*0.2)),b3dGgNoise(d*95.0+vec3(41.0)))-0.5;
    vec3 wn=normalize(up+wv*0.16+wv2*0.07);
    vec3 h=normalize(l+v);
    float nh=max(dot(wn,h),0.0);
    float core=pow(nh,260.0)*3.2;
    float spread=pow(nh,34.0)*0.38;
    // Low sun and a grazing view both stretch and brighten it.
    float fres=0.25+0.75*pow(1.0-max(dot(up,v),0.0),3.0);
    float day=smoothstep(-0.02,0.15,dot(up,l));
    col+=vec3(1.0,0.96,0.88)*(core+spread)*fres*day*sea*(1.0-ice)*psSea.y;
    // …and the sea's own sheen of sky at the limb.
    col+=vec3(0.25,0.4,0.6)*pow(1.0-max(dot(up,v),0.0),5.0)*0.25*day*sea;
  }
  gl_FragColor=vec4(col,1.0);
}`
}

export interface PlanetSurfaceOptions {
  /** A 2:1 colour map for the land (and the sea's base colour). */
  colorUrl?: string
  /** Is there a sea at all? */
  sea: boolean
  /** Height (planet units) at which land is all rock and snow. */
  heightScale: number
  /** Depth (planet units) at which the water is fully dark. */
  depthScale: number
  /** 0…1: strength of the sun's glint on the water. Default 1. */
  glint?: number
  /** 0…1: sea ice toward the poles. Default 0. */
  seaIce?: number
  seed?: number
}

/**
 * The material for a one-mesh planet. The mesh must carry each vertex's
 * height above the sea (negative below) in `uv.x`, with every vertex that is
 * below the sea placed AT sea level.
 */
export function createPlanetSurfaceMaterial(
  scene: BABYLON.Scene,
  options: PlanetSurfaceOptions
): BABYLON.ShaderMaterial {
  registerShader()
  const mat = new BABYLON.ShaderMaterial(
    'planet-surface',
    scene,
    { vertex: NAME, fragment: NAME },
    {
      attributes: ['position', 'normal', 'uv'],
      uniforms: [
        'world',
        'worldViewProjection',
        'psLight',
        'psEye',
        'psK',
        'psSea',
      ],
      samplers: ['psColor'],
    }
  )
  // No mipmaps on the map: the lookup jumps at the date line, and a mip
  // level chosen from that jump draws a seam down the back of the planet.
  const tex =
    options.colorUrl != null && options.colorUrl !== ''
      ? new BABYLON.Texture(
          options.colorUrl,
          scene,
          true,
          true,
          BABYLON.Texture.BILINEAR_SAMPLINGMODE
        )
      : BABYLON.RawTexture.CreateRGBATexture(
          new Uint8Array([255, 255, 255, 255]),
          1,
          1,
          scene,
          false
        )
  tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
  tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
  mat.setTexture('psColor', tex)
  mat.setVector4(
    'psK',
    new BABYLON.Vector4(
      options.heightScale,
      options.depthScale,
      (options.seed ?? 1) * 1.37,
      options.colorUrl ? 1 : 0
    )
  )
  const light = new BABYLON.Vector4(0, 1, 0, 0)
  const sea = new BABYLON.Vector4()
  mat.onBind = () => {
    sceneLight(scene, light)
    mat.setVector4('psLight', light)
    const cam = scene.activeCamera
    if (cam != null) mat.setVector3('psEye', cam.globalPosition)
    sea.set(
      options.sea ? 1 : 0,
      options.glint ?? 1,
      options.seaIce ?? 0,
      (performance.now() * 0.001) % 1000
    )
    mat.setVector4('psSea', sea)
  }
  mat.onDisposeObservable.add(() => tex.dispose())
  return mat
}
