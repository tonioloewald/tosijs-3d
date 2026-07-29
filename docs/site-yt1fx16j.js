import{Uj as U}from"./site-7mrsxkkh.js";import{Zj as w}from"./site-0yy388gf.js";import{_j as E}from"./site-1mc2p6p5.js";import{ky as T}from"./site-rfzv46xc.js";import{ly as L}from"./site-31h5gjmd.js";import{my as u}from"./site-6b0meaak.js";import{ny as R}from"./site-wep3rnxy.js";import{Wy as P}from"./site-58j2ewnw.js";import{Xy as N}from"./site-eay31fke.js";import{Yy as G}from"./site-ggwxysr4.js";import{cz as F}from"./site-5dczc761.js";import{dz as _,ez as A}from"./site-r50s22pj.js";import{fz as Z}from"./site-jmqgc3tb.js";import{gz as k}from"./site-aat7240y.js";import{jz as B}from"./site-h341dzb9.js";import{kz as $}from"./site-6dmnd63w.js";import{_B as f}from"./site-7jxv124x.js";var v="shadowMapVertexDeclaration",I=`#include<sceneVertexDeclaration>
#include<meshVertexDeclaration>
`;if(!f.IncludesShadersStore[v])f.IncludesShadersStore[v]=I;var J={name:v,shader:I};var y="shadowMapUboDeclaration",K=`layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;if(!f.IncludesShadersStore[y])f.IncludesShadersStore[y]=K;var O={name:y,shader:K};var z="shadowMapVertexExtraDeclaration",Q=`#if SM_NORMALBIAS==1
uniform vec3 lightDataSM;
#endif
uniform vec3 biasAndScaleSM;uniform vec2 depthValuesSM;varying float vDepthMetricSM;
#if SM_USEDISTANCE==1
varying vec3 vPositionWSM;
#endif
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying float zSM;
#endif
`;if(!f.IncludesShadersStore[z])f.IncludesShadersStore[z]=Q;var W={name:z,shader:Q};var C="shadowMapVertexNormalBias",X=`#if SM_NORMALBIAS==1
#if SM_DIRECTIONINLIGHTDATA==1
vec3 worldLightDirSM=normalize(-lightDataSM.xyz);
#else
vec3 directionToLightSM=lightDataSM.xyz-worldPos.xyz;vec3 worldLightDirSM=normalize(directionToLightSM);
#endif
float ndlSM=dot(vNormalW,worldLightDirSM);float sinNLSM=sqrt(1.0-ndlSM*ndlSM);float normalBiasSM=biasAndScaleSM.y*sinNLSM;worldPos.xyz-=vNormalW*normalBiasSM;
#endif
`;if(!f.IncludesShadersStore[C])f.IncludesShadersStore[C]=X;var Y={name:C,shader:X};var H="shadowMapVertexShader",b=`attribute vec3 position;
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
}`;if(!f.ShadersStore[H])f.ShadersStore[H]=b;var g=[Z,_,L,R,P,E,w,J,G,N,O,W,$,T,u,F,k,A,Y,U,B];for(let q of g)if(!f.IncludesShadersStore[q.name])f.IncludesShadersStore[q.name]=q.shader;var Yf={name:H,shader:b};
export{Yf as Tj};

//# debugId=EAD8C1F0924C576A64756E2164756E21
//# sourceMappingURL=site-yt1fx16j.js.map
