import{Mz as J}from"./site-vgb5vnjt.js";import{kA as H}from"./site-8w3m2z52.js";import{mA as F}from"./site-8j04nt09.js";import{tA as A}from"./site-z4mq96z7.js";import{vA as B}from"./site-xpb5srxe.js";import{zA as E}from"./site-5gffc1rv.js";import{AA as z}from"./site-dtr62002.js";import{BA as C}from"./site-q36bydad.js";import{CA as w}from"./site-mkcjsmh9.js";import{_B as k}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var v="gridVertexShader",K=`attribute position: vec3f;attribute normal: vec3f;
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
`;if(!k.ShadersStoreWGSL[v])k.ShadersStoreWGSL[v]=K;var M=[A,F,H,z,w,B,E,C,J];for(let q of M)if(!k.IncludesShadersStoreWGSL[q.name])k.IncludesShadersStoreWGSL[q.name]=q.shader;var y={name:v,shader:K};export{y as gridVertexShaderWGSL};

//# debugId=B53A26440534630664756E2164756E21
//# sourceMappingURL=grid.vertex-mdd8j6ra.js.map
