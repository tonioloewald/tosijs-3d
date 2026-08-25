import{Bh as g}from"./site-je7dhjds.js";import{Pz as l}from"./site-pc7wx50v.js";import{Rz as v}from"./site-gggacazs.js";import{Zz as c}from"./site-q3edtzfj.js";import{_z as u}from"./site-3njbfktn.js";import"./site-s8vfkdrs.js";import{aA as m}from"./site-10kj1b29.js";import"./site-b510f2ch.js";import{gA as d}from"./site-p3qvxbqn.js";import{jA as t}from"./site-t4ayqvvy.js";import{kA as s}from"./site-ngcgfsjk.js";import{EA as o}from"./site-j1mr7gyn.js";import{FA as a}from"./site-kcvb8kks.js";import{GA as n}from"./site-4ghhz517.js";import{HA as i}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var f="furPixelShader",p=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;uniform furColor: vec4f;uniform furLength: f32;varying vPositionW: vec3f;varying vfur_length: f32;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0..maxSimultaneousLights]
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;uniform vDiffuseInfos: vec2f;
#endif
#ifdef HIGHLEVEL
uniform furOffset: f32;uniform furOcclusion: f32;var furTextureSampler: sampler;var furTexture: texture_2d<f32>;varying vFurUV: vec2f;
#endif
#include<logDepthDeclaration>
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<fogFragmentDeclaration>
#include<clipPlaneFragmentDeclaration>
fn Rand(rv: vec3f)->f32 {var x: f32=dot(rv, vec3f(12.9898,78.233,24.65487));return fract(sin(x)*43758.5453);}
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var baseColor: vec4f=uniforms.furColor;var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;var alpha: f32=uniforms.vDiffuseColor.a;
#ifdef DIFFUSE
baseColor=baseColor*textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vDiffuseUV);
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
#include<depthPrePass>
baseColor=vec4f(baseColor.rgb*uniforms.vDiffuseInfos.y,baseColor.a);
#endif
#ifdef VERTEXCOLOR
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
#ifdef HIGHLEVEL
var furTextureColor: vec4f=textureSample(furTexture,furTextureSampler, vec2f(fragmentInputs.vFurUV.x,fragmentInputs.vFurUV.y));if (furTextureColor.a<=0.0 || furTextureColor.g<uniforms.furOffset) {discard;}
var occlusion: f32=mix(0.0,furTextureColor.b*1.2,uniforms.furOffset);baseColor= vec4f(baseColor.xyz*max(occlusion,uniforms.furOcclusion),1.1-uniforms.furOffset);
#endif
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#ifdef SPECULARTERM
var specularBase: vec3f= vec3f(0.,0.,0.);
#endif
#include<lightFragment>[0..maxSimultaneousLights]
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=fragmentInputs.vColor.a;
#endif
var finalDiffuse: vec3f=clamp(diffuseBase.rgb*baseColor.rgb,vec3f(0.0),vec3f(1.0));
#ifdef HIGHLEVEL
var color: vec4f= vec4f(finalDiffuse,alpha);
#else
var rr: f32=fragmentInputs.vfur_length/uniforms.furLength*0.5;var color: vec4f= vec4f(finalDiffuse*(0.5+rr),alpha);
#endif
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStoreWGSL[f])e.ShadersStoreWGSL[f]=p;var S=[t,u,s,l,m,o,i,n,c,v,d,a,g];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var N={name:f,shader:p};export{N as furPixelShaderWGSL};

//# debugId=521A5BC3085B13CB64756E2164756E21
//# sourceMappingURL=fur.fragment-55cemz5g.js.map
