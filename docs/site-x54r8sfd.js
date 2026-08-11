import{ky as H}from"./site-rfzv46xc.js";import{ly as E}from"./site-31h5gjmd.js";import{my as I}from"./site-6b0meaak.js";import{ny as F}from"./site-wep3rnxy.js";import{bz as y}from"./site-1da3yxp4.js";import{cz as z}from"./site-5dczc761.js";import{dz as w,ez as C}from"./site-r50s22pj.js";import{fz as v}from"./site-jmqgc3tb.js";import{gz as B}from"./site-aat7240y.js";import{_B as f}from"./site-7jxv124x.js";var q="pickingVertexShader",J=`attribute vec3 position;
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

//# debugId=1102B97F059BED2964756E2164756E21
//# sourceMappingURL=site-x54r8sfd.js.map
