import{vz as N}from"./site-3vfztpn2.js";import{Fz as O}from"./site-z4mzyk75.js";import{Gz as R}from"./site-75awats1.js";import{Mz as T}from"./site-gv8wrsgb.js";import{kA as Q}from"./site-jzegcmyz.js";import{mA as M}from"./site-mvqptzb8.js";import{tA as C}from"./site-banwg1x5.js";import{uA as y}from"./site-h42r3p91.js";import{vA as E}from"./site-swzkjcsr.js";import{wA as w}from"./site-kvv68a1k.js";import{xA as I}from"./site-nwf3d6yv.js";import{yA as H}from"./site-aezqz187.js";import{zA as K}from"./site-fnwnpcr3.js";import{AA as B}from"./site-kt4avh61.js";import{BA as J}from"./site-wb3kettg.js";import{CA as z}from"./site-zm0t5va7.js";import{_B as j}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var v="shadowOnlyVertexShader",U=`attribute position: vec3f;
#ifdef NORMAL
attribute normal: vec3f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<sceneUboDeclaration>
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
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
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=scene.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;
#ifdef NORMAL
vertexOutputs.vNormalW=normalize(( finalWorld* vec4f(vertexInputs.normal,0.0)).xyz);
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!j.ShadersStoreWGSL[v])j.ShadersStoreWGSL[v]=U;var X=[w,y,C,M,z,Q,B,N,O,E,H,I,J,T,K,R];for(let q of X)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var x={name:v,shader:U};export{x as shadowOnlyVertexShaderWGSL};

//# debugId=439702C920149D9364756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-kzx0t5q3.js.map
