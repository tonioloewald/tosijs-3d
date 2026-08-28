import{ak as E}from"./site-t093jytr.js";import{fk as W}from"./site-kz159q7d.js";import{gk as g}from"./site-kr23qrtj.js";import{bz as I}from"./site-x5qmcm6t.js";import{cz as T}from"./site-awdbhfyx.js";import{dz as A}from"./site-yb6m4nmt.js";import{ez as b}from"./site-3bypgmhg.js";import{Fz as U}from"./site-4grmvsrj.js";import{Gz as w}from"./site-ht78zrhn.js";import{Hz as N}from"./site-t3aad17c.js";import{oA as x}from"./site-0wedehmd.js";import{pA as h,qA as V}from"./site-ep0mpq5r.js";import{rA as M}from"./site-pvgny3b5.js";import{sA as v}from"./site-j4rsshqj.js";import{vA as D}from"./site-ygkkxrec.js";import{wA as u}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";var o="shadowMapVertexDeclaration",d=`#include<sceneVertexDeclaration>
#include<meshVertexDeclaration>
`;if(!e.IncludesShadersStore[o])e.IncludesShadersStore[o]=d;var l={name:o,shader:d};var a="shadowMapUboDeclaration",c=`layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;if(!e.IncludesShadersStore[a])e.IncludesShadersStore[a]=c;var m={name:a,shader:c};var t="shadowMapVertexExtraDeclaration",s=`#if SM_NORMALBIAS==1
uniform vec3 lightDataSM;
#endif
uniform vec3 biasAndScaleSM;uniform vec2 depthValuesSM;varying float vDepthMetricSM;
#if SM_USEDISTANCE==1
varying vec3 vPositionWSM;
#endif
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying float zSM;
#endif
`;if(!e.IncludesShadersStore[t])e.IncludesShadersStore[t]=s;var f={name:t,shader:s};var i="shadowMapVertexNormalBias",S=`#if SM_NORMALBIAS==1
#if SM_DIRECTIONINLIGHTDATA==1
vec3 worldLightDirSM=normalize(-lightDataSM.xyz);
#else
vec3 directionToLightSM=lightDataSM.xyz-worldPos.xyz;vec3 worldLightDirSM=normalize(directionToLightSM);
#endif
float ndlSM=dot(vNormalW,worldLightDirSM);float sinNLSM=sqrt(1.0-ndlSM*ndlSM);float normalBiasSM=biasAndScaleSM.y*sinNLSM;worldPos.xyz-=vNormalW*normalBiasSM;
#endif
`;if(!e.IncludesShadersStore[i])e.IncludesShadersStore[i]=S;var p={name:i,shader:S};var n="shadowMapVertexShader",L=`attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#ifdef INSTANCES
attribute vec4 world0;attribute vec4 world1;attribute vec4 world2;attribute vec4 world3;
#endif
#include<helperFunctions>
#include<__decl__shadowMapVertex>
#ifdef ALPHATEXTURE
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#include<shadowMapVertexExtraDeclaration>
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#ifdef NORMAL
vec3 normalUpdated=normal;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#ifdef NORMAL
mat3 normWorldSM=mat3(finalWorld);
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vec3 vNormalW=normalUpdated/vec3(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
vec3 vNormalW=normalize(normWorldSM*normalUpdated);
#endif
#endif
#include<shadowMapVertexNormalBias>
gl_Position=viewProjection*worldPos;
#include<shadowMapVertexMetric>
#ifdef ALPHATEXTURE
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<clipPlaneVertex>
}`;if(!e.ShadersStore[n])e.ShadersStore[n]=L;var P=[M,h,b,T,U,g,W,l,N,w,m,f,u,A,I,x,v,V,p,E,D];for(let r of P)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var Me={name:n,shader:L};
export{Me as $j};

//# debugId=9C3A87986FD2BA4064756E2164756E21
//# sourceMappingURL=site-x3jedkht.js.map
