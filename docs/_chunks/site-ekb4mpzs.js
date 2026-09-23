import{dz as p}from"./site-nn0nygmy.js";import{ez as d}from"./site-f0fs45dy.js";import{fz as c}from"./site-f9zcj7v8.js";import{gz as m}from"./site-5dj2847h.js";import{pA as a}from"./site-px85h4wa.js";import{qA as n}from"./site-1d4pv99f.js";import{rA as t,sA as s}from"./site-fzx6y8wc.js";import{tA as i}from"./site-fd6t4ht9.js";import{uA as l}from"./site-ner59851.js";import{FD as e}from"./site-vrsvvb55.js";var r="iblVoxelGridVertexShader",x=`attribute vec3 position;varying vec3 vNormalizedPosition;
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
}`;if(!e.ShadersStore[r])e.ShadersStore[r]=x;var f=[i,t,a,m,d,c,p,n,l,s];for(let o of f)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var _={name:r,shader:x};
export{_ as ui};

//# debugId=7F3805B367FDB09964756E2164756E21
//# sourceMappingURL=site-ekb4mpzs.js.map
