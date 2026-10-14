import * as BABYLON from '@babylonjs/core';
export declare const NOISE_TEXTURE_SAMPLER = "b3dVnTex";
export declare const NOISE_TEXTURE_GLSL = "\n#ifdef B3D_NOISETEX\nuniform highp sampler3D b3dVnTex;\nfloat b3dVn(vec3 x){vec3 i=floor(x);vec3 f=x-i;f=f*f*(3.0-2.0*f);return texture(b3dVnTex,(i+f+0.5)/64.0).r;}\n#else\nfloat b3dVn(vec3 x){return b3dGgNoise(x);}\n#endif\nfloat b3dVnFbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<3;i++){s+=a*b3dVn(p);p=p*2.03+vec3(7.1,3.3,5.7);a*=0.5;}return s/0.875;}\n";
/** Whether this scene's engine can read a 3D texture. */
export declare function hasNoiseTexture(scene: BABYLON.Scene): boolean;
/** The scene's one lattice texture, made on first use. */
export declare function noiseTextureOf(scene: BABYLON.Scene): BABYLON.RawTexture3D;
//# sourceMappingURL=noise-texture.d.ts.map