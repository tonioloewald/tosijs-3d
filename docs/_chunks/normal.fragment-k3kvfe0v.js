import{Bh as v}from"./site-je7dhjds.js";import{Pz as m}from"./site-pc7wx50v.js";import{Rz as u}from"./site-gggacazs.js";import{Zz as d}from"./site-q3edtzfj.js";import{_z as s}from"./site-3njbfktn.js";import"./site-s8vfkdrs.js";import{aA as c}from"./site-10kj1b29.js";import"./site-b510f2ch.js";import{gA as g}from"./site-p3qvxbqn.js";import{jA as t}from"./site-t4ayqvvy.js";import{kA as l}from"./site-ngcgfsjk.js";import{EA as f}from"./site-j1mr7gyn.js";import{FA as a}from"./site-kcvb8kks.js";import{GA as n}from"./site-4ghhz517.js";import{HA as o}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="normalPixelShader",p=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef LIGHTING
#include<helperFunctions>
#include<lightUboDeclaration>[0]
#include<lightUboDeclaration>[1]
#include<lightUboDeclaration>[2]
#include<lightUboDeclaration>[3]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#endif
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;uniform vDiffuseInfos: vec2f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
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
baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vDiffuseUV);
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
#include<depthPrePass>
baseColor=vec4f(baseColor.rgb*uniforms.vDiffuseInfos.y,baseColor.a);
#endif
#ifdef NORMAL
baseColor=mix(baseColor, vec4f(fragmentInputs.vNormalW,1.0),0.5);
#endif
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
#ifdef LIGHTING
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#include<lightFragment>[0]
#include<lightFragment>[1]
#include<lightFragment>[2]
#include<lightFragment>[3]
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
var finalDiffuse: vec3f= baseColor.rgb;
#endif
var color: vec4f= vec4f(finalDiffuse,alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=p;var S=[t,s,m,c,o,l,f,n,d,u,g,a,v];for(let i of S)if(!e.IncludesShadersStoreWGSL[i.name])e.IncludesShadersStoreWGSL[i.name]=i.shader;var E={name:r,shader:p};export{E as normalPixelShaderWGSL};

//# debugId=4DE9E20E2271375E64756E2164756E21
//# sourceMappingURL=normal.fragment-k3kvfe0v.js.map
