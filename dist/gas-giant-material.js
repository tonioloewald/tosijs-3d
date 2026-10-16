/*#
# gas-giant-material

**A gas giant you can fly round.** `createGasGiantMaterial(scene, look)` returns
a material for a sphere, drawn by the same [gas-giant](/gas-giant/) function
that draws one in a moon's sky. [`<tosi-b3d-planet gas="saturn">`](/b3d-planet/)
uses it, and so does the [star system](/b3d-star-system/) for its giants.

It lights itself: a soft terminator, a limb that darkens (which is most of
what makes a ball of gas read as a ball), and a thin bright rim of haze on the
day side. The light is the first point or directional light in the scene
unless you pass `light`.

```javascript
import { createGasGiantMaterial, resolveGasGiant } from 'tosijs-3d'

sphere.material = createGasGiantMaterial(scene, resolveGasGiant('neptune'))
```

The bands follow the sphere's own Y axis, so turning the mesh turns the
planet, and tilting it tilts the bands.
*/
/*{ "parent": "gas-giant", "order": 10 }*/
import * as BABYLON from '@babylonjs/core';
import { GAS_GIANT_GLSL, RING_GLSL, gasGiantRgb, } from './gas-giant.js';
import { sceneSeconds } from './b3d-utils.js';
const NAME = 'b3dGasGiant';
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
  vBody=normalize(position);
  vec4 w=world*vec4(position,1.0);
  vWorld=w.xyz;
  vNormalW=normalize(mat3(world)*normal);
  gl_Position=worldViewProjection*vec4(position,1.0);
}`;
    store[`${NAME}FragmentShader`] = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 vBody;
varying vec3 vWorld;
varying vec3 vNormalW;
uniform vec3 ggEye;
uniform vec4 ggLight;
uniform vec4 ggK;
uniform vec3 ggC0;
uniform vec3 ggC1;
uniform vec3 ggC2;
uniform float ggTime;
uniform vec4 ggRing;
uniform vec4 ggRingAt;
uniform vec3 ggRingN;
${GAS_GIANT_GLSL}
${RING_GLSL}
/*
THE RINGS' SHADOW ON THE PLANET (#3320). From here toward the star, where
does the ray cross the ring plane, and how much ring is there? The answer is
the ring's own function, so the shadow has the ring's gaps. ggRing is
(inner / outer, outer in radii, opacity, seed); ggRingAt the centre and radius.
*/
float ggRingShade(vec3 p,vec3 l){
  // No early returns: fwidth (here and in b3dRing) is only defined when
  // every pixel of a quad takes the same path, so compute, then mask.
  vec3 N=normalize(ggRingN);
  float dn=dot(l,N);
  float sdn=abs(dn)<1e-4?1e-4:dn;
  float k=dot(ggRingAt.xyz-p,N)/sdn;
  vec3 rel=p+l*k-ggRingAt.xyz;
  float rr=length(rel)/(ggRingAt.w*max(ggRing.y,1e-4));
  float t=(rr-ggRing.x)/max(1.0-ggRing.x,1e-4);
  float px=max(fwidth(t),1e-5);
  vec2 ring=b3dRing(clamp(t,0.0,1.0),atan(rel.z,rel.x),ggRing.w,px);
  float on=step(0.0,ggRing.z-1e-6)*step(1e-4,abs(dn))*step(0.0,k)*step(0.0,t)*step(t,1.0);
  return 1.0-on*clamp(ring.y*ggRing.z,0.0,1.0);
}
void main(){
  vec3 n=normalize(vNormalW);
  vec3 l=ggLight.w>0.5?normalize(ggLight.xyz-vWorld):normalize(ggLight.xyz);
  vec3 v=normalize(ggEye-vWorld);
  vec3 alb=b3dGasGiant(normalize(vBody),ggK,ggC0,ggC1,ggC2,ggTime);
  vec3 c=b3dGasGiantLit(alb,dot(n,l),dot(n,v),mix(ggC0,vec3(1.0),0.4));
  c*=mix(0.08,1.0,ggRingShade(vWorld,l));
  gl_FragColor=vec4(c+alb*0.012,1.0);
}`;
}
/** A material that draws `look` on a sphere. Dispose it with the mesh. */
export function createGasGiantMaterial(scene, look, options = {}) {
    registerShader();
    const mat = new BABYLON.ShaderMaterial('gas-giant', scene, { vertex: NAME, fragment: NAME }, {
        attributes: ['position', 'normal'],
        uniforms: [
            'world',
            'worldViewProjection',
            'ggEye',
            'ggLight',
            'ggK',
            'ggC0',
            'ggC1',
            'ggC2',
            'ggTime',
            'ggRing',
            'ggRingAt',
            'ggRingN',
        ],
    });
    const [c0, c1, c2] = look.colors.map(gasGiantRgb);
    mat.setVector4('ggK', new BABYLON.Vector4(look.bands, look.turbulence, look.storm, look.seed));
    mat.setVector3('ggC0', new BABYLON.Vector3(...c0));
    mat.setVector3('ggC1', new BABYLON.Vector3(...c1));
    mat.setVector3('ggC2', new BABYLON.Vector3(...c2));
    const spin = options.spin ?? 1;
    const light = new BABYLON.Vector4(0, 1, 0, 0);
    const ringK = new BABYLON.Vector4(0, 1, 0, 0);
    const ringAt = new BABYLON.Vector4();
    const ringN = new BABYLON.Vector3(0, 1, 0);
    mat.onBind = () => {
        const cam = scene.activeCamera;
        if (cam != null)
            mat.setVector3('ggEye', cam.globalPosition);
        const given = options.light?.();
        if (given != null)
            light.set(given.x, given.y, given.z, given.w);
        else
            sceneLight(scene, light);
        mat.setVector4('ggLight', light);
        mat.setFloat('ggTime', sceneSeconds(scene) * spin);
        const r = options.ring?.();
        if (r == null || r.opacity <= 0)
            ringK.set(0, 1, 0, 0);
        else {
            ringK.set(r.inner / r.outer, r.outer, r.opacity, r.seed);
            ringAt.set(r.center.x, r.center.y, r.center.z, r.radius);
            ringN.set(r.normal.x, r.normal.y, r.normal.z);
        }
        mat.setVector4('ggRing', ringK);
        mat.setVector4('ggRingAt', ringAt);
        mat.setVector3('ggRingN', ringN);
    };
    return mat;
}
/** The scene's first point light (a star) or directional light (a sun). */
export function sceneLight(scene, out) {
    for (const l of scene.lights) {
        if (!l.isEnabled())
            continue;
        if (l instanceof BABYLON.PointLight) {
            const p = l.getAbsolutePosition();
            out.set(p.x, p.y, p.z, 1);
            return;
        }
        if (l instanceof BABYLON.DirectionalLight) {
            out.set(-l.direction.x, -l.direction.y, -l.direction.z, 0);
            return;
        }
    }
    out.set(0, 1, 0, 0);
}
//# sourceMappingURL=gas-giant-material.js.map