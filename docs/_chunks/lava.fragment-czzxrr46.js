import{Bh as g}from"./site-je7dhjds.js";import{Pz as m}from"./site-pc7wx50v.js";import{Rz as u}from"./site-gggacazs.js";import{Zz as v}from"./site-q3edtzfj.js";import{_z as l}from"./site-3njbfktn.js";import"./site-s8vfkdrs.js";import{aA as c}from"./site-10kj1b29.js";import"./site-b510f2ch.js";import{gA as d}from"./site-p3qvxbqn.js";import{jA as t}from"./site-t4ayqvvy.js";import{kA as s}from"./site-ngcgfsjk.js";import{EA as f}from"./site-j1mr7gyn.js";import{FA as a}from"./site-kcvb8kks.js";import{GA as n}from"./site-4ghhz517.js";import{HA as i}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="lavaPixelShader",p=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;varying vPositionW: vec3f;uniform time: f32;uniform speed: f32;uniform movingSpeed: f32;uniform fogColor: vec3f;var noiseTextureSampler: sampler;var noiseTexture: texture_2d<f32>;uniform fogDensity: f32;varying noise: f32;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0]
#include<lightUboDeclaration>[1]
#include<lightUboDeclaration>[2]
#include<lightUboDeclaration>[3]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;uniform vDiffuseInfos: vec2f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
fn random(scale: vec3f,seed: f32)->f32 {return fract(sin(dot(fragmentInputs.position.xyz+seed,scale))*43758.5453+seed);}
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var baseColor: vec4f= vec4f(1.,1.,1.,1.);var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;var alpha: f32=uniforms.vDiffuseColor.a;
#ifdef DIFFUSE
var noiseTex: vec4f=textureSample(noiseTexture,noiseTextureSampler,fragmentInputs.vDiffuseUV);var T1: vec2f=fragmentInputs.vDiffuseUV+ vec2f(1.5,-1.5)*uniforms.time*0.02;var T2: vec2f=fragmentInputs.vDiffuseUV+ vec2f(-0.5,2.0)*uniforms.time*0.01*uniforms.speed;T1=vec2f(T1.x+noiseTex.x*2.0,T1.y+noiseTex.y*2.0);T2=vec2f(T2.x-noiseTex.y*0.2-uniforms.time*0.001*uniforms.movingSpeed,T2.y+noiseTex.z*0.2+uniforms.time*0.002*uniforms.movingSpeed);var p: f32=textureSample(noiseTexture,noiseTextureSampler,T1*3.0).a;var lavaColor: vec4f=textureSample(diffuseSampler,diffuseSamplerSampler,T2*4.0);var temp: vec4f=lavaColor*( vec4f(p,p,p,p)*2.)+(lavaColor*lavaColor-0.1);baseColor=temp;var depth: f32=fragmentInputs.position.z*4.0;let LOG2: f32=1.442695;var fogFactor: f32=exp2(-uniforms.fogDensity*uniforms.fogDensity*depth*depth*LOG2);fogFactor=1.0-clamp(fogFactor,0.0,1.0);baseColor=mix(baseColor, vec4f(uniforms.fogColor,baseColor.w), vec4f(fogFactor));diffuseColor=baseColor.rgb;
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
#ifdef UNLIT
var diffuseBase: vec3f= vec3f(1.,1.,1.);
#else
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#include<lightFragment>[0]
#include<lightFragment>[1]
#include<lightFragment>[2]
#include<lightFragment>[3]
#endif
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=fragmentInputs.vColor.a;
#endif
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;var color: vec4f= vec4f(finalDiffuse,alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=p;var S=[t,l,m,c,i,s,f,n,v,u,d,a,g];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var P={name:o,shader:p};export{P as lavaPixelShaderWGSL};

//# debugId=B1B2FE8DCB8A33B864756E2164756E21
//# sourceMappingURL=lava.fragment-czzxrr46.js.map
