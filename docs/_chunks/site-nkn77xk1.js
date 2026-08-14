import{sA as N}from"./site-38skj2nr.js";import{tA as E}from"./site-banwg1x5.js";import{uA as y}from"./site-h42r3p91.js";import{vA as F}from"./site-swzkjcsr.js";import{wA as w}from"./site-kvv68a1k.js";import{xA as I}from"./site-nwf3d6yv.js";import{yA as H}from"./site-aezqz187.js";import{zA as K}from"./site-fnwnpcr3.js";import{AA as B}from"./site-kt4avh61.js";import{BA as J}from"./site-wb3kettg.js";import{CA as z}from"./site-zm0t5va7.js";import{_B as h}from"./site-1q3afg48.js";var q="colorVertexShader",O=`attribute position: vec3f;
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform view: mat4x4f;
#endif
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
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
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!h.ShadersStoreWGSL[q])h.ShadersStoreWGSL[q]=O;var Q=[w,y,z,B,E,F,H,I,J,K,N];for(let j of Q)if(!h.IncludesShadersStoreWGSL[j.name])h.IncludesShadersStoreWGSL[j.name]=j.shader;var C={name:q,shader:O};
export{C as rA};

//# debugId=4B817E37CAC58F2364756E2164756E21
//# sourceMappingURL=site-nkn77xk1.js.map
