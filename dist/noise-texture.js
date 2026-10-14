/*
Shader noise READ instead of computed. Value noise in a fragment shader is
eight hashed corners a sample; a cloud pixel takes 54 samples. Here the
lattice is a 3D texture with one random byte a point (noise-volume's
`latticeVolume`), the shader eases the fraction itself, and the linear filter
does the eight-corner blend: the same noise from one read. It also cannot
suffer the fault the arithmetic hash had on a headset, where neighbouring
cells disagreed about a shared corner.

`NOISE_TEXTURE_GLSL` defines `b3dVn(p)` (0…1, like `b3dGgNoise`) and
`b3dVnFbm(p)` (like `b3dGgFbm`). With `B3D_NOISETEX` undefined (no 3D
textures: WebGL 1) they are the arithmetic ones, so it must come after
`GAS_GIANT_GLSL`.
*/
import * as BABYLON from '@babylonjs/core';
import { latticeVolume } from './noise-volume.js';
const CELLS = 64;
export const NOISE_TEXTURE_SAMPLER = 'b3dVnTex';
export const NOISE_TEXTURE_GLSL = `
#ifdef B3D_NOISETEX
uniform highp sampler3D b3dVnTex;
float b3dVn(vec3 x){vec3 i=floor(x);vec3 f=x-i;f=f*f*(3.0-2.0*f);return texture(b3dVnTex,(i+f+0.5)/${CELLS}.0).r;}
#else
float b3dVn(vec3 x){return b3dGgNoise(x);}
#endif
float b3dVnFbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<3;i++){s+=a*b3dVn(p);p=p*2.03+vec3(7.1,3.3,5.7);a*=0.5;}return s/0.875;}
`;
const textures = new WeakMap();
/** Whether this scene's engine can read a 3D texture. */
export function hasNoiseTexture(scene) {
    return ((scene.getEngine().webGLVersion ??
        0) >= 2);
}
/** The scene's one lattice texture, made on first use. */
export function noiseTextureOf(scene) {
    let tex = textures.get(scene);
    if (tex == null) {
        tex = new BABYLON.RawTexture3D(latticeVolume(CELLS), CELLS, CELLS, CELLS, BABYLON.Constants.TEXTUREFORMAT_R, scene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE, BABYLON.Constants.TEXTURETYPE_UNSIGNED_BYTE);
        tex.name = 'lattice-noise';
        tex.wrapU = tex.wrapV = tex.wrapR = BABYLON.Texture.WRAP_ADDRESSMODE;
        textures.set(scene, tex);
        /*
        SHARED, so it belongs to the scene and not to whoever holds it. A mesh
        disposed "with its material and textures" would otherwise take this away
        from every other material reading it (a planet rebuilding its clouds
        left its own surface with a dead texture, and a material with a dead
        texture is never ready: the planet vanished). It goes with the scene.
        */
        const dispose = tex.dispose.bind(tex);
        tex.dispose = () => { };
        scene.onDisposeObservable.addOnce(() => {
            textures.delete(scene);
            dispose();
        });
    }
    return tex;
}
//# sourceMappingURL=noise-texture.js.map