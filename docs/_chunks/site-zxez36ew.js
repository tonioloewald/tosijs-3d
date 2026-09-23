import{ck as E}from"./site-5grn08z4.js";import{hk as W}from"./site-sbjx7vwe.js";import{ik as g}from"./site-82m4jewt.js";import{dz as I}from"./site-nn0nygmy.js";import{ez as T}from"./site-f0fs45dy.js";import{fz as A}from"./site-f9zcj7v8.js";import{gz as b}from"./site-5dj2847h.js";import{Hz as U}from"./site-md667va8.js";import{Iz as w}from"./site-61a59p2s.js";import{Jz as N}from"./site-k72q68wn.js";import{qA as x}from"./site-1d4pv99f.js";import{rA as h,sA as V}from"./site-fzx6y8wc.js";import{tA as M}from"./site-fd6t4ht9.js";import{uA as v}from"./site-ner59851.js";import{xA as D}from"./site-dywf9vzn.js";import{yA as u}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";var o="shadowMapVertexDeclaration",d=`#include<sceneVertexDeclaration>
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
export{Me as bk};

//# debugId=0718582600A5E76064756E2164756E21
//# sourceMappingURL=site-zxez36ew.js.map
