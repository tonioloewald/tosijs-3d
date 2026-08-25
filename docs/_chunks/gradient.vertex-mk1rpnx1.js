import{vz as u}from"./site-j4gsdbhf.js";import{Fz as x}from"./site-28xht8fz.js";import{Gz as S}from"./site-skhnnwaq.js";import{Mz as V}from"./site-sxz4tpxg.js";import{kA as p}from"./site-ngcgfsjk.js";import{sA as s}from"./site-y7h65xf9.js";import{tA as f}from"./site-r9g7b3jk.js";import{uA as o}from"./site-6w70dcy8.js";import{vA as c}from"./site-a7gatv2c.js";import{wA as r}from"./site-46ekkv30.js";import{xA as l}from"./site-ks7svjaa.js";import{yA as d}from"./site-2j048m3x.js";import{zA as m}from"./site-yej5cjxm.js";import{AA as a}from"./site-ar3nhn4n.js";import{BA as v}from"./site-35gh5jpy.js";import{CA as n}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var t="gradientVertexShader",L=`attribute position: vec3f;
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

//# debugId=0787366AB615213064756E2164756E21
//# sourceMappingURL=gradient.vertex-mk1rpnx1.js.map
