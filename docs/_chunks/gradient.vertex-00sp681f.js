import{vz as R}from"./site-3vfztpn2.js";import{Fz as T}from"./site-z4mzyk75.js";import{Gz as X}from"./site-75awats1.js";import{Mz as Y}from"./site-gv8wrsgb.js";import{kA as U}from"./site-jzegcmyz.js";import{sA as Q}from"./site-38skj2nr.js";import{tA as H}from"./site-banwg1x5.js";import{uA as z}from"./site-h42r3p91.js";import{vA as I}from"./site-swzkjcsr.js";import{wA as y}from"./site-kvv68a1k.js";import{xA as K}from"./site-nwf3d6yv.js";import{yA as J}from"./site-aezqz187.js";import{zA as O}from"./site-fnwnpcr3.js";import{AA as E}from"./site-kt4avh61.js";import{BA as N}from"./site-wb3kettg.js";import{CA as B}from"./site-zm0t5va7.js";import{_B as j}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var w="gradientVertexShader",Z=`attribute position: vec3f;
#ifdef NORMAL
attribute normal: vec3f;
#endif
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
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;varying vPosition: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
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
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;vertexOutputs.vPosition=vertexInputs.position;
#ifdef NORMAL
vertexOutputs.vNormalW=normalize(( finalWorld* vec4f(vertexInputs.normal,0.0)).xyz);
#endif
#ifndef UV1
var uv: vec2f= vec2f(0.,0.);
#else
var uv: vec2f=vertexInputs.uv;
#endif
#ifndef UV2
var uv2: vec2f= vec2f(0.,0.);
#else
var uv2: vec2f=vertexInputs.uv2;
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!j.ShadersStoreWGSL[w])j.ShadersStoreWGSL[w]=Z;var _=[y,z,H,B,U,E,R,T,I,J,K,N,Y,O,X,Q];for(let q of _)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var V={name:w,shader:Z};export{V as gradientVertexShaderWGSL};

//# debugId=2FC4670FA55F3C3064756E2164756E21
//# sourceMappingURL=gradient.vertex-00sp681f.js.map
