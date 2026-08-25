import{ky as s}from"./site-669y2q89.js";import{ly as d}from"./site-vxe7fynz.js";import{my as p}from"./site-2qqvh5ah.js";import{ny as c}from"./site-7qs7fydd.js";import{bz as n}from"./site-mrme3sf5.js";import{cz as i}from"./site-hkdwmcpe.js";import{dz as t,ez as l}from"./site-1smnc4rx.js";import{fz as a}from"./site-94m3976t.js";import{gz as m}from"./site-fe75yrpf.js";import{_B as e}from"./site-ea0e8ybd.js";var o="meshUVSpaceRendererVertexShader",S=`precision highp float;attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 projMatrix;varying vec2 vDecalTC;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
void main(void) {vec3 positionUpdated=position;vec3 normalUpdated=normal;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);mat3 normWorldSM=mat3(finalWorld);vec3 vNormalW;
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vNormalW=normalUpdated/vec3(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
vNormalW=normalize(normWorldSM*normalUpdated);
#endif
vec3 normalView=normalize((projMatrix*vec4(vNormalW,0.0)).xyz);vec3 decalTC=(projMatrix*worldPos).xyz;vDecalTC=decalTC.xy;gl_Position=vec4(uv*2.0-1.0,normalView.z>0.0 ? 2. : decalTC.z,1.0);}`;if(!e.ShadersStore[o])e.ShadersStore[o]=S;var v=[a,t,d,c,n,s,p,i,m,l];for(let r of v)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var D={name:o,shader:S};
export{D as sh};

//# debugId=297529789125234264756E2164756E21
//# sourceMappingURL=site-qbxyqjm5.js.map
