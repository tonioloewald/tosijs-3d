import{vz as T}from"./site-3vfztpn2.js";import{Fz as U}from"./site-z4mzyk75.js";import{Gz as Y}from"./site-75awats1.js";import{Mz as Z}from"./site-gv8wrsgb.js";import{jA as R}from"./site-0asqx2x4.js";import{kA as X}from"./site-jzegcmyz.js";import{sA as Q}from"./site-38skj2nr.js";import{tA as H}from"./site-banwg1x5.js";import{uA as z}from"./site-h42r3p91.js";import{vA as I}from"./site-swzkjcsr.js";import{wA as y}from"./site-kvv68a1k.js";import{xA as K}from"./site-nwf3d6yv.js";import{yA as J}from"./site-aezqz187.js";import{zA as O}from"./site-fnwnpcr3.js";import{AA as E}from"./site-kt4avh61.js";import{BA as N}from"./site-wb3kettg.js";import{CA as B}from"./site-zm0t5va7.js";import{_B as j}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var w="triplanarVertexShader",_=`attribute position: vec3f;
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
`;if(!j.ShadersStoreWGSL[w])j.ShadersStoreWGSL[w]=_;var $=[R,y,z,H,B,X,E,T,U,I,J,K,N,Z,O,Y,Q];for(let q of $)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var x={name:w,shader:_};export{x as triplanarVertexShaderWGSL};

//# debugId=EA6C34C0BE0F82C764756E2164756E21
//# sourceMappingURL=triplanar.vertex-jbzwxfb6.js.map
