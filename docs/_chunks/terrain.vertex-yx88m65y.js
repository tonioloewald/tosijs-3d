import{vz as s}from"./site-j4gsdbhf.js";import{Fz as x}from"./site-28xht8fz.js";import{Gz as p}from"./site-skhnnwaq.js";import{Mz as V}from"./site-sxz4tpxg.js";import{kA as S}from"./site-ngcgfsjk.js";import{sA as m}from"./site-y7h65xf9.js";import{tA as a}from"./site-r9g7b3jk.js";import{uA as n}from"./site-6w70dcy8.js";import{vA as d}from"./site-a7gatv2c.js";import{wA as i}from"./site-46ekkv30.js";import{xA as u}from"./site-ks7svjaa.js";import{yA as c}from"./site-2j048m3x.js";import{zA as v}from"./site-yej5cjxm.js";import{AA as f}from"./site-ar3nhn4n.js";import{BA as l}from"./site-35gh5jpy.js";import{CA as o}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="terrainVertexShader",L=`attribute position: vec3f;
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
varying vTextureUV: vec2f;uniform textureMatrix: mat4x4f;uniform vTextureInfos: vec2f;
#endif
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#include<logDepthDeclaration>
#include<clipPlaneVertexDeclaration>
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
if (uniforms.vTextureInfos.x==0.)
{vertexOutputs.vTextureUV=(uniforms.textureMatrix* vec4f(uv,1.0,0.0)).xy;}
else
{vertexOutputs.vTextureUV=(uniforms.textureMatrix* vec4f(uv2,1.0,0.0)).xy;}
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=L;var W=[i,n,a,S,o,f,s,x,d,c,u,l,V,v,p,m];for(let t of W)if(!e.IncludesShadersStoreWGSL[t.name])e.IncludesShadersStoreWGSL[t.name]=t.shader;var w={name:r,shader:L};export{w as terrainVertexShaderWGSL};

//# debugId=A8A5089C49CB2EAA64756E2164756E21
//# sourceMappingURL=terrain.vertex-yx88m65y.js.map
