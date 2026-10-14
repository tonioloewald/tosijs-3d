/*
A STAR'S SURFACE, as one material for a sphere. What makes a star read as a
ball rather than a white disc is LIMB DARKENING: toward its edge you look
through the cooler, higher layers, so it dims and reddens. Under that, a
seething granulation (convection cells, slowly moving) and a few sunspots,
from the gas giant's noise (no textures). Unlit: it is the light.

Used by <tosi-b3d-star> and the star system's star.
*/
import * as BABYLON from '@babylonjs/core';
import { GAS_GIANT_GLSL } from './gas-giant.js';
import { sceneSeconds } from './b3d-utils.js';
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
`;
const FRAGMENT = `
precision highp float;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocal;
uniform vec3 starColor;
uniform vec3 cameraPosition;
uniform vec4 starK; // time, seed, glow, detail
${GAS_GIANT_GLSL}
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
  float m=max(max(c.r,c.g),c.b);
  c=mix(min(c,vec3(1.0)),vec3(1.0),smoothstep(0.85,1.75,m));
  gl_FragColor=vec4(c,1.0);
}
`;
let registered = false;
export function createStarMaterial(scene, options) {
    if (!registered) {
        BABYLON.Effect.ShadersStore['b3dStarSurfaceVertexShader'] = VERTEX;
        BABYLON.Effect.ShadersStore['b3dStarSurfaceFragmentShader'] = FRAGMENT;
        registered = true;
    }
    const mat = new BABYLON.ShaderMaterial('star-surface', scene, { vertex: 'b3dStarSurface', fragment: 'b3dStarSurface' }, {
        attributes: ['position', 'normal'],
        uniforms: [
            'world',
            'worldViewProjection',
            'starColor',
            'cameraPosition',
            'starK',
        ],
    });
    const [r, g, b] = options.rgb;
    mat.setVector3('starColor', new BABYLON.Vector3(r, g, b));
    const k = new BABYLON.Vector4(0, options.seed ?? 1, options.glow ?? 1, options.detail ?? 0.6);
    mat.onBind = () => {
        const cam = scene.activeCamera;
        if (cam)
            mat.setVector3('cameraPosition', cam.globalPosition);
        k.x = sceneSeconds(scene);
        mat.setVector4('starK', k);
    };
    return mat;
}
//# sourceMappingURL=star-material.js.map