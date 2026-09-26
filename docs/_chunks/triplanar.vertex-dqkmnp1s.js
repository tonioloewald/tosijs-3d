import{re}from"./site-k4eckz4x.js";import{Qe,qe,Ue,Ne,Xe,$e}from"./site-e0ybn2qx.js";import{be,Se}from"./site-v5nrt80s.js";import{X}from"./site-vka3s0eg.js";import{lt,ft}from"./site-1fnr94jv.js";import{Yi}from"./site-nn3mg5rb.js";import{ei,ti}from"./site-jev74p6a.js";import{st}from"./site-gbqy22ka.js";import{mi}from"./site-5zrygvy0.js";import{i}from"./site-1yf4ncc8.js";var r="triplanarVertexShader",n=`attribute position: vec3f;
#ifdef NORMAL
attribute normal: vec3f;
#endif
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<helperFunctions>
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform view: mat4x4f;uniform viewProjection: mat4x4f;
#ifdef DIFFUSEX
varying vTextureUVX: vec2f;
#endif
#ifdef DIFFUSEY
varying vTextureUVY: vec2f;
#endif
#ifdef DIFFUSEZ
varying vTextureUVZ: vec2f;
#endif
uniform tileSize: f32;
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef NORMAL
varying tangentSpace0: vec3f;varying tangentSpace1: vec3f;varying tangentSpace2: vec3f;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
fn main(input : VertexInputs)->FragmentInputs
{
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
var colorUpdated: vec4f=vertexInputs.color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;
#ifdef DIFFUSEX
vertexOutputs.vTextureUVX=worldPos.zy/uniforms.tileSize;
#endif
#ifdef DIFFUSEY
vertexOutputs.vTextureUVY=worldPos.xz/uniforms.tileSize;
#endif
#ifdef DIFFUSEZ
vertexOutputs.vTextureUVZ=worldPos.xy/uniforms.tileSize;
#endif
#ifdef NORMAL
var xtan: vec3f= vec3f(0,0,1);var xbin: vec3f= vec3f(0,1,0);var ytan: vec3f= vec3f(1,0,0);var ybin: vec3f= vec3f(0,0,1);var ztan: vec3f= vec3f(1,0,0);var zbin: vec3f= vec3f(0,1,0);var normalizedNormal: vec3f=normalize(vertexInputs.normal);normalizedNormal=normalizedNormal*normalizedNormal;var worldBinormal: vec3f=normalize(xbin*normalizedNormal.x+ybin*normalizedNormal.y+zbin*normalizedNormal.z);var worldTangent: vec3f=normalize(xtan*normalizedNormal.x+ytan*normalizedNormal.y+ztan*normalizedNormal.z);var normalWorld: mat3x3f= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz);
#ifdef NONUNIFORMSCALING
normalWorld=transposeMat3(inverseMat3(normalWorld));
#endif
worldTangent=normalize((normalWorld*worldTangent).xyz);worldBinormal=normalize((normalWorld*worldBinormal).xyz);var worldNormal: vec3f=normalize((normalWorld*normalize(vertexInputs.normal)).xyz);vertexOutputs.tangentSpace0=worldTangent;vertexOutputs.tangentSpace1=worldBinormal;vertexOutputs.tangentSpace2=worldNormal;
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=n;var o=[re,Qe,qe,Ue,be,X,lt,Yi,ei,Ne,Xe,$e,Se,st,ft,ti,mi];for(let e of o)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var N={name:r,shader:n};export{N as triplanarVertexShaderWGSL};

//# debugId=5FC09EBD43F8579E64756E2164756E21
//# sourceMappingURL=triplanar.vertex-dqkmnp1s.js.map
