import{by as u}from"./site-e2ybmp7j.js";import{ly as S}from"./site-5fd1kg31.js";import{my as x}from"./site-t1apa46f.js";import{Mz as V}from"./site-mvfkq6qz.js";import{Qz as p}from"./site-sskzjsez.js";import{Xz as s}from"./site-3xtsc73f.js";import{Yz as f}from"./site-y7tmjswn.js";import{Zz as o}from"./site-k95xbt0c.js";import{_z as c}from"./site-qpgt37yc.js";import{$z as r}from"./site-vfnvgm24.js";import{aA as l}from"./site-rw0sq824.js";import{bA as d}from"./site-2st9rym3.js";import{cA as m}from"./site-5ewpa529.js";import{dA as a}from"./site-47xw6rhq.js";import{eA as v}from"./site-ecygzf33.js";import{fA as n}from"./site-52tvgysg.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var t="gradientVertexShader",L=`attribute position: vec3f;
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
`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=L;var W=[r,o,f,n,p,a,u,x,c,d,l,v,V,m,S,s];for(let i of W)if(!e.IncludesShadersStoreWGSL[i.name])e.IncludesShadersStoreWGSL[i.name]=i.shader;var w={name:t,shader:L};export{w as gradientVertexShaderWGSL};

//# debugId=0183D84F88FB5DE664756E2164756E21
//# sourceMappingURL=gradient.vertex-nkgc13je.js.map
