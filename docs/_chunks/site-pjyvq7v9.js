import{dk as B}from"./site-h78h59s0.js";import{Iz as P}from"./site-3zqr2f8s.js";import{Jz as A}from"./site-40j2q6d0.js";import{Kz as k}from"./site-a3kb4bgm.js";import{Lz as b}from"./site-gjwmfx0p.js";import{jA as $}from"./site-0asqx2x4.js";import{lA as _}from"./site-2zb4ht88.js";import{mA as Z}from"./site-mvqptzb8.js";import{uA as K}from"./site-h42r3p91.js";import{vA as Q}from"./site-swzkjcsr.js";import{wA as J}from"./site-kvv68a1k.js";import{xA as X}from"./site-nwf3d6yv.js";import{yA as T}from"./site-aezqz187.js";import{BA as Y}from"./site-wb3kettg.js";import{CA as O}from"./site-zm0t5va7.js";import{_B as f}from"./site-1q3afg48.js";var v="shadowMapVertexExtraDeclaration",C=`#if SM_NORMALBIAS==1
uniform lightDataSM: vec3f;
#endif
uniform biasAndScaleSM: vec3f;uniform depthValuesSM: vec2f;varying vDepthMetricSM: f32;
#if SM_USEDISTANCE==1
varying vPositionWSM: vec3f;
#endif
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying zSM: f32;
#endif
`;if(!f.IncludesShadersStoreWGSL[v])f.IncludesShadersStoreWGSL[v]=C;var F={name:v,shader:C};var y="shadowMapVertexNormalBias",H=`#if SM_NORMALBIAS==1
#if SM_DIRECTIONINLIGHTDATA==1
var worldLightDirSM: vec3f=normalize(-uniforms.lightDataSM.xyz);
#else
var directionToLightSM: vec3f=uniforms.lightDataSM.xyz-worldPos.xyz;var worldLightDirSM: vec3f=normalize(directionToLightSM);
#endif
var ndlSM: f32=dot(vNormalW,worldLightDirSM);var sinNLSM: f32=sqrt(1.0-ndlSM*ndlSM);var normalBiasSM: f32=uniforms.biasAndScaleSM.y*sinNLSM;worldPos=vec4f(worldPos.xyz-vNormalW*normalBiasSM,worldPos.w);
#endif
`;if(!f.IncludesShadersStoreWGSL[y])f.IncludesShadersStoreWGSL[y]=H;var I={name:y,shader:H};var z="shadowMapVertexShader",N=`attribute position: vec3f;
#ifdef NORMAL
attribute normal: vec3f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#ifdef INSTANCES
attribute world0: vec4f;attribute world1: vec4f;attribute world2: vec4f;attribute world3: vec4f;
#endif
#include<helperFunctions>
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
#ifdef ALPHATEXTURE
varying vUV: vec2f;uniform diffuseMatrix: mat4x4f;
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#endif
#include<shadowMapVertexExtraDeclaration>
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;
#ifdef UV1
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#ifdef UV2
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#ifdef NORMAL
var normalUpdated: vec3f=vertexInputs.normal;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(positionUpdated,1.0);
#ifdef NORMAL
var normWorldSM: mat3x3f= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz);
#if defined(INSTANCES) && defined(THIN_INSTANCES)
var vNormalW: vec3f=normalUpdated/ vec3f(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
var vNormalW: vec3f=normalize(normWorldSM*normalUpdated);
#endif
#endif
#include<shadowMapVertexNormalBias>
vertexOutputs.position=scene.viewProjection*worldPos;
#include<shadowMapVertexMetric>
#ifdef ALPHATEXTURE
#ifdef UV1
vertexOutputs.vUV= (uniforms.diffuseMatrix* vec4f(uvUpdated,1.0,0.0)).xy;
#endif
#ifdef UV2
vertexOutputs.vUV= (uniforms.diffuseMatrix* vec4f(uv2Updated,1.0,0.0)).xy;
#endif
#endif
#include<clipPlaneVertex>
}`;if(!f.ShadersStoreWGSL[z])f.ShadersStoreWGSL[z]=N;var R=[J,K,b,k,$,Z,_,F,O,A,P,Q,T,X,I,B,Y];for(let q of R)if(!f.IncludesShadersStoreWGSL[q.name])f.IncludesShadersStoreWGSL[q.name]=q.shader;var t={name:z,shader:N};
export{t as ck};

//# debugId=FC93247CE64EC7FB64756E2164756E21
//# sourceMappingURL=site-pjyvq7v9.js.map
