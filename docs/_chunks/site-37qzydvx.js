import{bz as p}from"./site-x5qmcm6t.js";import{cz as c}from"./site-awdbhfyx.js";import{dz as s}from"./site-yb6m4nmt.js";import{ez as d}from"./site-3bypgmhg.js";import{nA as n}from"./site-e1dgx5rz.js";import{oA as i}from"./site-0wedehmd.js";import{pA as t,qA as l}from"./site-ep0mpq5r.js";import{rA as a}from"./site-pvgny3b5.js";import{sA as m}from"./site-j4rsshqj.js";import{DD as e}from"./site-53d1aqt6.js";var o="meshUVSpaceRendererVertexShader",S=`precision highp float;attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 projMatrix;varying vec2 vDecalTC;
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
export{D as ih};

//# debugId=1917530304E1932B64756E2164756E21
//# sourceMappingURL=site-37qzydvx.js.map
