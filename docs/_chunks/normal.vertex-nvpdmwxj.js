import{vz as m}from"./site-j4gsdbhf.js";import{Fz as v}from"./site-28xht8fz.js";import{Gz as S}from"./site-skhnnwaq.js";import{Mz as p}from"./site-sxz4tpxg.js";import{kA as x}from"./site-ngcgfsjk.js";import{tA as a}from"./site-r9g7b3jk.js";import{uA as n}from"./site-6w70dcy8.js";import{vA as s}from"./site-a7gatv2c.js";import{wA as r}from"./site-46ekkv30.js";import{xA as c}from"./site-ks7svjaa.js";import{yA as u}from"./site-2j048m3x.js";import{zA as l}from"./site-yej5cjxm.js";import{AA as f}from"./site-ar3nhn4n.js";import{BA as d}from"./site-35gh5jpy.js";import{CA as o}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var t="normalVertexShader",V=`attribute position: vec3f;
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
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;uniform diffuseMatrix: mat4x4f;uniform vDiffuseInfos: vec2f;
#endif
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
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
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;
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
#ifdef DIFFUSE
if (uniforms.vDiffuseInfos.x==0.)
{vertexOutputs.vDiffuseUV=(uniforms.diffuseMatrix* vec4f(uv,1.0,0.0)).xy;}
else
{vertexOutputs.vDiffuseUV=(uniforms.diffuseMatrix* vec4f(uv2,1.0,0.0)).xy;}
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=V;var L=[r,n,a,o,x,f,m,v,s,u,c,d,p,l,S];for(let i of L)if(!e.IncludesShadersStoreWGSL[i.name])e.IncludesShadersStoreWGSL[i.name]=i.shader;var w={name:t,shader:V};export{w as normalVertexShaderWGSL};

//# debugId=6338B494BA2D9AB264756E2164756E21
//# sourceMappingURL=normal.vertex-nvpdmwxj.js.map
