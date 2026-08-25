import{Mz as d}from"./site-sxz4tpxg.js";import{kA as s}from"./site-ngcgfsjk.js";import{mA as v}from"./site-1nn7frmg.js";import{tA as o}from"./site-r9g7b3jk.js";import{vA as f}from"./site-a7gatv2c.js";import{zA as c}from"./site-yej5cjxm.js";import{AA as n}from"./site-ar3nhn4n.js";import{BA as a}from"./site-35gh5jpy.js";import{CA as r}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="gridVertexShader",u=`attribute position: vec3f;attribute normal: vec3f;
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#include<instancesDeclaration>
#include<sceneUboDeclaration>
varying vPosition: vec3f;varying vNormal: vec3f;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
varying vWorldPos: vec3f;
#endif
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#ifdef OPACITY
varying vOpacityUV: vec2f;uniform opacityMatrix: mat4x4f;uniform vOpacityInfos: vec2f;
#endif
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);
#include<fogVertex>
var cameraSpacePosition: vec4f=scene.view*worldPos;vertexOutputs.position=scene.projection*cameraSpacePosition;
#ifdef OPACITY
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
if (uniforms.vOpacityInfos.x==0.)
{vertexOutputs.vOpacityUV=(uniforms.opacityMatrix* vec4f(uv,1.0,0.0)).xy;}
else
{vertexOutputs.vOpacityUV=(uniforms.opacityMatrix* vec4f(uv2,1.0,0.0)).xy;}
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
vertexOutputs.vPosition=vertexInputs.position;vertexOutputs.vNormal=vertexInputs.normal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
vertexOutputs.vWorldPos=worldPos.xyz;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[i])e.ShadersStoreWGSL[i]=u;var l=[o,v,s,n,r,f,c,a,d];for(let t of l)if(!e.IncludesShadersStoreWGSL[t.name])e.IncludesShadersStoreWGSL[t.name]=t.shader;var E={name:i,shader:u};export{E as gridVertexShaderWGSL};

//# debugId=B0DA589A6B92F8EF64756E2164756E21
//# sourceMappingURL=grid.vertex-nf6s9ejv.js.map
