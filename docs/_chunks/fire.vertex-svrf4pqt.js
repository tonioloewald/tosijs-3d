import{Mz as R}from"./site-gv8wrsgb.js";import{kA as Q}from"./site-jzegcmyz.js";import{sA as O}from"./site-38skj2nr.js";import{tA as F}from"./site-banwg1x5.js";import{uA as z}from"./site-h42r3p91.js";import{vA as H}from"./site-swzkjcsr.js";import{wA as y}from"./site-kvv68a1k.js";import{xA as J}from"./site-nwf3d6yv.js";import{yA as I}from"./site-aezqz187.js";import{zA as N}from"./site-fnwnpcr3.js";import{AA as E}from"./site-kt4avh61.js";import{BA as K}from"./site-wb3kettg.js";import{CA as B}from"./site-zm0t5va7.js";import{_B as j}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var w="fireVertexShader",T=`attribute position: vec3f;
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform view: mat4x4f;uniform viewProjection: mat4x4f;
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;
#endif
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
uniform time: f32;uniform speed: f32;
#ifdef DIFFUSE
varying vDistortionCoords1: vec2f;varying vDistortionCoords2: vec2f;varying vDistortionCoords3: vec2f;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
var colorUpdated: vec4f=vertexInputs.color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;
#ifdef DIFFUSE
vertexOutputs.vDiffuseUV=vec2f(vertexInputs.uv.x,vertexInputs.uv.y-0.2);
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<vertexColorMixing>
#ifdef DIFFUSE
var layerSpeed: vec3f= vec3f(-0.2,-0.52,-0.1)*uniforms.speed;vertexOutputs.vDistortionCoords1=vec2f(vertexInputs.uv.x,vertexInputs.uv.y+layerSpeed.x*uniforms.time/1000.0);vertexOutputs.vDistortionCoords2=vec2f(vertexInputs.uv.x,vertexInputs.uv.y+layerSpeed.y*uniforms.time/1000.0);vertexOutputs.vDistortionCoords3=vec2f(vertexInputs.uv.x,vertexInputs.uv.y+layerSpeed.z*uniforms.time/1000.0);
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!j.ShadersStoreWGSL[w])j.ShadersStoreWGSL[w]=T;var U=[y,z,F,B,Q,E,H,I,J,K,R,N,O];for(let q of U)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var d={name:w,shader:T};export{d as fireVertexShaderWGSL};

//# debugId=B97C02F7E133785364756E2164756E21
//# sourceMappingURL=fire.vertex-svrf4pqt.js.map
