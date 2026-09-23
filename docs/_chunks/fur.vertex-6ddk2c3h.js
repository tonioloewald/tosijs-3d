import{dy as d}from"./site-s6yq1afk.js";import{ny as g}from"./site-53xk42cj.js";import{oy as x}from"./site-5w3ef7b1.js";import{Oz as S}from"./site-bv1k2m3f.js";import{Sz as p}from"./site-qppa82tt.js";import{Zz as l}from"./site-cd3v83k9.js";import{_z as a}from"./site-5507dwyb.js";import{$z as n}from"./site-dcm56c99.js";import{aA as u}from"./site-zxt8a8z1.js";import{bA as i}from"./site-0t8qnxs0.js";import{cA as s}from"./site-3734pz33.js";import{dA as v}from"./site-mhy5tdpx.js";import{eA as m}from"./site-tqjmspfh.js";import{fA as o}from"./site-zz9ayhhh.js";import{gA as c}from"./site-01eh560w.js";import{hA as f}from"./site-5222jdjd.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var t="furVertexShader",V=`attribute position: vec3f;attribute normal: vec3f;
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
uniform furLength: f32;uniform furAngle: f32;
#ifdef HIGHLEVEL
uniform furOffset: f32;uniform furGravity: vec3f;uniform furTime: f32;uniform furSpacing: f32;uniform furDensity: f32;
#endif
#ifdef HEIGHTMAP
var heightTextureSampler: sampler;var heightTexture: texture_2d<f32>;
#endif
#ifdef HIGHLEVEL
varying vFurUV: vec2f;
#endif
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
varying vfur_length: f32;
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
fn Rand(rv: vec3f)->f32 {var x: f32=dot(rv, vec3f(12.9898,78.233,24.65487));return fract(sin(x)*43758.5453);}
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
var r: f32=Rand(vertexInputs.position);
#ifdef HEIGHTMAP
vertexOutputs.vfur_length=uniforms.furLength*textureSampleLevel(heightTexture,heightTextureSampler,vertexInputs.uv,0.).x;
#else
vertexOutputs.vfur_length=(uniforms.furLength*r);
#endif
var tangent1: vec3f= vec3f(vertexInputs.normal.y,-vertexInputs.normal.x,0);var tangent2: vec3f= vec3f(-vertexInputs.normal.z,0,vertexInputs.normal.x);r=Rand(tangent1*r);var J: f32=(2.0+4.0*r);r=Rand(tangent2*r);var K: f32=(2.0+2.0*r);tangent1=tangent1*J+tangent2*K;tangent1=normalize(tangent1);var newPosition: vec3f=vertexInputs.position+vertexInputs.normal*vertexOutputs.vfur_length*cos(uniforms.furAngle)+tangent1*vertexOutputs.vfur_length*sin(uniforms.furAngle);
#ifdef HIGHLEVEL
var forceDirection: vec3f= vec3f(0.0,0.0,0.0);forceDirection.x=sin(uniforms.furTime+vertexInputs.position.x*0.05)*0.2;forceDirection.y=cos(uniforms.furTime*0.7+vertexInputs.position.y*0.04)*0.2;forceDirection.z=sin(uniforms.furTime*0.7+vertexInputs.position.z*0.04)*0.2;var displacement: vec3f= vec3f(0.0,0.0,0.0);displacement=uniforms.furGravity+forceDirection;var displacementFactor: f32=pow(uniforms.furOffset,3.0);var aNormal: vec3f=vertexInputs.normal;aNormal=vec3f(aNormal.xyz+displacement*displacementFactor);newPosition= vec3f(newPosition.x,newPosition.y,newPosition.z)+(normalize(aNormal)*uniforms.furOffset*uniforms.furSpacing);
#endif
#ifdef NORMAL
vertexOutputs.vNormalW=normalize(( finalWorld* vec4f(vertexInputs.normal,0.0)).xyz);
#endif
vertexOutputs.position=uniforms.viewProjection*finalWorld* vec4f(newPosition,1.0);var worldPos: vec4f=finalWorld* vec4f(newPosition,1.0);vertexOutputs.vPositionW= worldPos.xyz;
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
#ifdef HIGHLEVEL
vertexOutputs.vFurUV=vertexOutputs.vDiffuseUV*uniforms.furDensity;
#endif
#else
#ifdef HIGHLEVEL
vertexOutputs.vFurUV=uv*uniforms.furDensity;
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=V;var L=[i,n,a,f,p,o,d,x,u,v,s,c,S,m,g,l];for(let r of L)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var b={name:t,shader:V};export{b as furVertexShaderWGSL};

//# debugId=B083393B4121BCD064756E2164756E21
//# sourceMappingURL=fur.vertex-6ddk2c3h.js.map
