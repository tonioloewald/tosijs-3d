/*
The material for a planet drawn from a colour map: the map looked up by the
direction of each pixel from the planet's centre (so there is no seam and no
pinch, whatever the mesh), lit by the scene's sun or star with the mesh's own
normals, which carry the relief. Babylon-side companion to planet-map.
*/
import * as BABYLON from '@babylonjs/core';
import { sceneLight } from './gas-giant-material.js';
const NAME = 'b3dMappedPlanet';
function registerShader() {
    const store = BABYLON.Effect.ShadersStore;
    if (store[`${NAME}VertexShader`])
        return;
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
}`;
    // Longitude -180..180 runs left to right across the map and latitude 90
    // to -90 top to bottom; a Babylon texture has its top at v = 1.
    store[`${NAME}FragmentShader`] = `
precision highp float;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
uniform sampler2D pmColor;
uniform vec4 pmLight;
void main(){
  vec3 d=normalize(vBody);
  vec2 uv=vec2(atan(d.z,d.x)/6.2831853+0.5,1.0-acos(clamp(d.y,-1.0,1.0))/3.14159265);
  vec3 alb=texture2D(pmColor,uv).rgb;
  vec3 n=normalize(vNormalW);
  vec3 l=pmLight.w>0.5?normalize(pmLight.xyz-vWorld):normalize(pmLight.xyz);
  float lit=smoothstep(-0.05,0.25,dot(n,l))*(0.25+0.75*max(dot(n,l),0.0));
  // The night side is DIM, not black: starlight and the glow of its own air
  // leave a real planet's dark half readable, and at 2% the land vanished
  // while the white cloud above it could still be seen.
  gl_FragColor=vec4(alb*(lit+0.09),1.0);
}`;
}
/** A material that draws an equirectangular colour map on a sphere. */
export function createMappedPlanetMaterial(scene, colorUrl) {
    registerShader();
    const mat = new BABYLON.ShaderMaterial('mapped-planet', scene, { vertex: NAME, fragment: NAME }, {
        attributes: ['position', 'normal'],
        uniforms: ['world', 'worldViewProjection', 'pmLight'],
        samplers: ['pmColor'],
    });
    // No mipmaps: the lookup jumps at the date line, and a mip level chosen
    // from that jump draws a seam down the back of the planet.
    const tex = new BABYLON.Texture(colorUrl, scene, true, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    mat.setTexture('pmColor', tex);
    const light = new BABYLON.Vector4(0, 1, 0, 0);
    mat.onBind = () => {
        sceneLight(scene, light);
        mat.setVector4('pmLight', light);
    };
    mat.onDisposeObservable.add(() => tex.dispose());
    return mat;
}
//# sourceMappingURL=planet-map-material.js.map