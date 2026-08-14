import{vz as R}from"./site-3vfztpn2.js";import{Fz as T}from"./site-z4mzyk75.js";import{Gz as X}from"./site-75awats1.js";import{Mz as Y}from"./site-gv8wrsgb.js";import{kA as U}from"./site-jzegcmyz.js";import{sA as Q}from"./site-38skj2nr.js";import{tA as H}from"./site-banwg1x5.js";import{uA as z}from"./site-h42r3p91.js";import{vA as I}from"./site-swzkjcsr.js";import{wA as y}from"./site-kvv68a1k.js";import{xA as K}from"./site-nwf3d6yv.js";import{yA as J}from"./site-aezqz187.js";import{zA as O}from"./site-fnwnpcr3.js";import{AA as E}from"./site-kt4avh61.js";import{BA as N}from"./site-wb3kettg.js";import{CA as B}from"./site-zm0t5va7.js";import{_B as j}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var w="waterVertexShader",Z=`attribute position: vec3f;
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
#ifdef BUMP
varying vNormalUV: vec2f;
#ifdef BUMPSUPERIMPOSE
varying vNormalUV2: vec2f;
#endif
uniform normalMatrix: mat4x4f;uniform vNormalInfos: vec2f;
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
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#include<logDepthDeclaration>
uniform reflectionViewProjection: mat4x4f;uniform windDirection: vec2f;uniform waveLength: f32;uniform time: f32;uniform windForce: f32;uniform waveHeight: f32;uniform waveSpeed: f32;uniform waveCount: f32;varying vRefractionMapTexCoord: vec3f;varying vReflectionMapTexCoord: vec3f;
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
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.vPositionW= worldPos.xyz;
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
#ifdef BUMP
if (uniforms.vNormalInfos.x==0.)
{vertexOutputs.vNormalUV=(uniforms.normalMatrix* vec4f((uv*1.0)/uniforms.waveLength+uniforms.time*uniforms.windForce*uniforms.windDirection,1.0,0.0)).xy;
#ifdef BUMPSUPERIMPOSE
vertexOutputs.vNormalUV2=(uniforms.normalMatrix* vec4f((uv*0.721)/uniforms.waveLength+uniforms.time*1.2*uniforms.windForce*uniforms.windDirection,1.0,0.0)).xy;
#endif
}
else
{vertexOutputs.vNormalUV=(uniforms.normalMatrix* vec4f((uv2*1.0)/uniforms.waveLength+uniforms.time*uniforms.windForce*uniforms.windDirection,1.0,0.0)).xy;
#ifdef BUMPSUPERIMPOSE
vertexOutputs.vNormalUV2=(uniforms.normalMatrix* vec4f((uv2*0.721)/uniforms.waveLength+uniforms.time*1.2*uniforms.windForce*uniforms.windDirection,1.0,0.0)).xy;
#endif
}
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
var finalWaveCount: f32=1.0/(uniforms.waveCount*0.5);
#ifdef USE_WORLD_COORDINATES
var p: vec3f=worldPos.xyz;
#else
var p: vec3f=vertexInputs.position;
#endif
var newY: f32=(sin(((p.x/finalWaveCount)+uniforms.time*uniforms.waveSpeed))*uniforms.waveHeight*uniforms.windDirection.x*5.0)
+ (cos(((p.z/finalWaveCount)+uniforms.time*uniforms.waveSpeed))*uniforms.waveHeight*uniforms.windDirection.y*5.0);p.y=p.y+abs(newY);
#ifdef USE_WORLD_COORDINATES
vertexOutputs.position=uniforms.viewProjection* vec4f(p,1.0);
#else
vertexOutputs.position=uniforms.viewProjection*finalWorld* vec4f(p,1.0);
#endif
#ifdef REFLECTION
vertexOutputs.vRefractionMapTexCoord=vec3f(
0.5*(vertexOutputs.position.w+vertexOutputs.position.x),
0.5*(vertexOutputs.position.w+vertexOutputs.position.y),
vertexOutputs.position.w
);worldPos=uniforms.reflectionViewProjection*finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.vReflectionMapTexCoord=vec3f(
0.5*(worldPos.w+worldPos.x),
0.5*(worldPos.w+worldPos.y),
worldPos.w
);
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!j.ShadersStoreWGSL[w])j.ShadersStoreWGSL[w]=Z;var _=[y,z,H,B,E,R,T,U,I,J,K,N,O,X,Q,Y];for(let q of _)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var V={name:w,shader:Z};export{V as waterVertexShaderWGSL};

//# debugId=28019D86BC420A9464756E2164756E21
//# sourceMappingURL=water.vertex-j4sjc6zr.js.map
