import{Qe,qe,Ue,Ne,Xe,$e}from"./site-e0ybn2qx.js";import{be,Se}from"./site-v5nrt80s.js";import{lt,ft}from"./site-1fnr94jv.js";import{Yi}from"./site-nn3mg5rb.js";import{ei,ti}from"./site-jev74p6a.js";import{X}from"./site-vka3s0eg.js";import{mi}from"./site-5zrygvy0.js";import{st}from"./site-gbqy22ka.js";import{i}from"./site-1yf4ncc8.js";var r="waterVertexShader",o=`attribute position: vec3f;
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
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var n=[Qe,qe,Ue,be,lt,Yi,ei,X,Ne,Xe,$e,Se,ft,ti,mi,st];for(let e of n)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var g={name:r,shader:o};export{g as waterVertexShaderWGSL};

//# debugId=63E8CC9E1FCC329764756E2164756E21
//# sourceMappingURL=water.vertex-4kca4j15.js.map
