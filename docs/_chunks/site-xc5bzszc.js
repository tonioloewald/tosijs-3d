import{Iz as M}from"./site-3zqr2f8s.js";import{Jz as K}from"./site-40j2q6d0.js";import{Kz as I}from"./site-a3kb4bgm.js";import{Lz as H}from"./site-gjwmfx0p.js";import{Mz as N}from"./site-gv8wrsgb.js";import{kA as J}from"./site-jzegcmyz.js";import{tA as z}from"./site-banwg1x5.js";import{uA as w}from"./site-h42r3p91.js";import{vA as B}from"./site-swzkjcsr.js";import{wA as v}from"./site-kvv68a1k.js";import{xA as E}from"./site-nwf3d6yv.js";import{yA as C}from"./site-aezqz187.js";import{BA as F}from"./site-wb3kettg.js";import{CA as y}from"./site-zm0t5va7.js";import{_B as f}from"./site-1q3afg48.js";var q="outlineVertexShader",O=`attribute position: vec3f;attribute normal: vec3f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
uniform offset: f32;
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#ifdef ALPHATEST
varying vUV: vec2f;uniform diffuseMatrix: mat4x4f; 
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input: VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;var normalUpdated: vec3f=vertexInputs.normal;
#ifdef UV1
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#ifdef UV2
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
var offsetPosition: vec3f=positionUpdated+(normalUpdated*uniforms.offset);
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld*vec4f(offsetPosition,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uvUpdated,1.0,0.0)).xy;
#endif
#ifdef UV2
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uv2Updated,1.0,0.0)).xy;
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
}
`;if(!f.ShadersStoreWGSL[q])f.ShadersStoreWGSL[q]=O;var Q=[v,w,H,I,y,z,J,K,M,B,C,E,F,N];for(let j of Q)if(!f.IncludesShadersStoreWGSL[j.name])f.IncludesShadersStoreWGSL[j.name]=j.shader;var p={name:q,shader:O};
export{p as Qg};

//# debugId=4A9E7DA6A4EB235464756E2164756E21
//# sourceMappingURL=site-xc5bzszc.js.map
