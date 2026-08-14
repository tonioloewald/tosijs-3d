import{ky as H}from"./site-a7t3w6tt.js";import{ly as E}from"./site-p3a38267.js";import{my as I}from"./site-8azsvrvv.js";import{ny as F}from"./site-me4sbwwy.js";import{bz as y}from"./site-dwr5s1ha.js";import{cz as z}from"./site-z5fa4raw.js";import{dz as w,ez as C}from"./site-zx8qtfzw.js";import{fz as v}from"./site-f2k7n4ns.js";import{gz as B}from"./site-2e30jbpw.js";import{_B as f}from"./site-1q3afg48.js";var q="pickingVertexShader",J=`attribute vec3 position;
#if defined(INSTANCES)
attribute float instanceMeshID;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
uniform mat4 viewProjection;
#if defined(INSTANCES)
flat varying float vMeshID;
#endif
void main(void) {vec3 positionUpdated=position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);gl_Position=viewProjection*worldPos;
#if defined(INSTANCES)
vMeshID=instanceMeshID;
#endif
}
`;if(!f.ShadersStore[q])f.ShadersStore[q]=J;var K=[v,w,E,F,y,H,I,z,B,C];for(let j of K)if(!f.IncludesShadersStore[j.name])f.IncludesShadersStore[j.name]=j.shader;var Z={name:q,shader:J};
export{Z as sw};

//# debugId=A3E38C3C69AA410464756E2164756E21
//# sourceMappingURL=site-bh7zbmsa.js.map
