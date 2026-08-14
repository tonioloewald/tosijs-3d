import{ky as H}from"./site-a7t3w6tt.js";import{ly as E}from"./site-p3a38267.js";import{my as I}from"./site-8azsvrvv.js";import{ny as F}from"./site-me4sbwwy.js";import{bz as y}from"./site-dwr5s1ha.js";import{cz as z}from"./site-z5fa4raw.js";import{dz as w,ez as C}from"./site-zx8qtfzw.js";import{fz as v}from"./site-f2k7n4ns.js";import{gz as B}from"./site-2e30jbpw.js";import{_B as f}from"./site-1q3afg48.js";var q="iblVoxelGridVertexShader",J=`attribute vec3 position;varying vec3 vNormalizedPosition;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
uniform mat4 invWorldScale;uniform mat4 viewMatrix;void main(void) {vec3 positionUpdated=position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);gl_Position=viewMatrix*invWorldScale*worldPos;vNormalizedPosition.xyz=gl_Position.xyz*0.5+0.5;
#ifdef IS_NDC_HALF_ZRANGE
gl_Position.z=gl_Position.z*0.5+0.5;
#endif
}`;if(!f.ShadersStore[q])f.ShadersStore[q]=J;var K=[v,w,y,E,F,H,I,z,B,C];for(let j of K)if(!f.IncludesShadersStore[j.name])f.IncludesShadersStore[j.name]=j.shader;var Z={name:q,shader:J};
export{Z as mi};

//# debugId=08C3E435C4D047C564756E2164756E21
//# sourceMappingURL=site-cw8qkq9a.js.map
