import{vz as M}from"./site-va0q0csr.js";import{Fz as N}from"./site-f3cv88g4.js";import{Gz as Q}from"./site-se4ftdn4.js";import{Mz as R}from"./site-vgb5vnjt.js";import{kA as O}from"./site-8w3m2z52.js";import{tA as C}from"./site-z4mq96z7.js";import{uA as y}from"./site-yr3y3wm3.js";import{vA as E}from"./site-xpb5srxe.js";import{wA as w}from"./site-96mjvkgz.js";import{xA as I}from"./site-0t2fmc8s.js";import{yA as H}from"./site-4gz1nses.js";import{zA as K}from"./site-5gffc1rv.js";import{AA as B}from"./site-dtr62002.js";import{BA as J}from"./site-q36bydad.js";import{CA as z}from"./site-mkcjsmh9.js";import{_B as j}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var v="normalVertexShader",T=`attribute position: vec3f;
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
`;if(!j.ShadersStoreWGSL[v])j.ShadersStoreWGSL[v]=T;var U=[w,y,C,z,O,B,M,N,E,H,I,J,R,K,Q];for(let q of U)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var g={name:v,shader:T};export{g as normalVertexShaderWGSL};

//# debugId=A52935F4D122A8D264756E2164756E21
//# sourceMappingURL=normal.vertex-sfvwps21.js.map
