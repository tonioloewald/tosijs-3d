import{Mz as E}from"./site-gv8wrsgb.js";import{kA as C}from"./site-jzegcmyz.js";import{lA as B}from"./site-2zb4ht88.js";import{mA as A}from"./site-mvqptzb8.js";import{tA as w}from"./site-banwg1x5.js";import{vA as y}from"./site-swzkjcsr.js";import{BA as z}from"./site-wb3kettg.js";import{CA as v}from"./site-zm0t5va7.js";import{_B as f}from"./site-1q3afg48.js";var q="lineVertexShader",F=`#define ADDITIONAL_VERTEX_DECLARATION
#include<instancesDeclaration>
#include<clipPlaneVertexDeclaration>
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position: vec3f;attribute normal: vec4f;uniform width: f32;uniform aspectRatio: f32;
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
var worldViewProjection: mat4x4f=scene.viewProjection*finalWorld;var viewPosition: vec4f=worldViewProjection* vec4f(vertexInputs.position,1.0);var viewPositionNext: vec4f=worldViewProjection* vec4f(vertexInputs.normal.xyz,1.0);var currentScreen: vec2f=viewPosition.xy/viewPosition.w;var nextScreen: vec2f=viewPositionNext.xy/viewPositionNext.w;currentScreen=vec2f(currentScreen.x*uniforms.aspectRatio,currentScreen.y);nextScreen=vec2f(nextScreen.x*uniforms.aspectRatio,nextScreen.y);var dir: vec2f=normalize(nextScreen-currentScreen);var normalDir: vec2f= vec2f(-dir.y,dir.x);normalDir*=uniforms.width/2.0;normalDir=vec2f(normalDir.x/uniforms.aspectRatio,normalDir.y);var offset: vec4f= vec4f(normalDir*vertexInputs.normal.w,0.0,0.0);vertexOutputs.position=viewPosition+offset;
#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
var worldPos: vec4f=finalWorld*vec4f(vertexInputs.position,1.0);
#include<clipPlaneVertex>
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!f.ShadersStoreWGSL[q])f.ShadersStoreWGSL[q]=F;var H=[w,v,A,B,C,y,z,E];for(let k of H)if(!f.IncludesShadersStoreWGSL[k.name])f.IncludesShadersStoreWGSL[k.name]=k.shader;var Y={name:q,shader:F};
export{Y as Wg};

//# debugId=819A257540BF8CD664756E2164756E21
//# sourceMappingURL=site-3papx50t.js.map
