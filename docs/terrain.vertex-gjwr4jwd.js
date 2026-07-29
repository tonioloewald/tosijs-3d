import{vz as R}from"./site-va0q0csr.js";import{Fz as T}from"./site-f3cv88g4.js";import{Gz as X}from"./site-se4ftdn4.js";import{Mz as Y}from"./site-vgb5vnjt.js";import{kA as U}from"./site-8w3m2z52.js";import{sA as Q}from"./site-qzx2edtk.js";import{tA as H}from"./site-z4mq96z7.js";import{uA as z}from"./site-yr3y3wm3.js";import{vA as I}from"./site-xpb5srxe.js";import{wA as y}from"./site-96mjvkgz.js";import{xA as K}from"./site-0t2fmc8s.js";import{yA as J}from"./site-4gz1nses.js";import{zA as O}from"./site-5gffc1rv.js";import{AA as E}from"./site-dtr62002.js";import{BA as N}from"./site-q36bydad.js";import{CA as B}from"./site-mkcjsmh9.js";import{_B as j}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var w="terrainVertexShader",Z=`attribute position: vec3f;
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
`;if(!j.ShadersStoreWGSL[w])j.ShadersStoreWGSL[w]=Z;var _=[y,z,H,U,B,E,R,T,I,J,K,N,Y,O,X,Q];for(let q of _)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var V={name:w,shader:Z};export{V as terrainVertexShaderWGSL};

//# debugId=B9AF8BDC4B25D3E664756E2164756E21
//# sourceMappingURL=terrain.vertex-gjwr4jwd.js.map
