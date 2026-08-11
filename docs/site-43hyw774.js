import{ky as H}from"./site-rfzv46xc.js";import{ly as E}from"./site-31h5gjmd.js";import{my as I}from"./site-6b0meaak.js";import{ny as F}from"./site-wep3rnxy.js";import{bz as y}from"./site-1da3yxp4.js";import{cz as z}from"./site-5dczc761.js";import{dz as w,ez as C}from"./site-r50s22pj.js";import{fz as v}from"./site-jmqgc3tb.js";import{gz as B}from"./site-aat7240y.js";import{_B as f}from"./site-7jxv124x.js";var q="iblVoxelGridVertexShader",J=`attribute vec3 position;varying vec3 vNormalizedPosition;
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

//# debugId=1B15075D814622E664756E2164756E21
//# sourceMappingURL=site-43hyw774.js.map
