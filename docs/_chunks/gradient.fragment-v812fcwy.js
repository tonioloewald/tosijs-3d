import{Bh as v}from"./site-je7dhjds.js";import{Pz as m}from"./site-pc7wx50v.js";import{Rz as g}from"./site-gggacazs.js";import{Zz as d}from"./site-q3edtzfj.js";import{_z as l}from"./site-3njbfktn.js";import"./site-s8vfkdrs.js";import{aA as c}from"./site-10kj1b29.js";import"./site-b510f2ch.js";import{gA as u}from"./site-p3qvxbqn.js";import{jA as t}from"./site-t4ayqvvy.js";import{kA as s}from"./site-ngcgfsjk.js";import{EA as n}from"./site-j1mr7gyn.js";import{FA as f}from"./site-kcvb8kks.js";import{GA as a}from"./site-4ghhz517.js";import{HA as r}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="gradientPixelShader",p=`uniform vEyePosition: vec4f;uniform topColor: vec4f;uniform bottomColor: vec4f;uniform offset: f32;uniform scale: f32;uniform smoothness: f32;varying vPositionW: vec3f;varying vPosition: vec3f;
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
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var h: f32=fragmentInputs.vPosition.y*uniforms.scale+uniforms.offset;var mysmoothness: f32=clamp(uniforms.smoothness,0.01,max(uniforms.smoothness,10.));var baseColor: vec4f=mix(uniforms.bottomColor,uniforms.topColor,vec4f(max(pow(max(h,0.0),mysmoothness),0.0)));var diffuseColor: vec3f=baseColor.rgb;var alpha: f32=baseColor.a;
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
#include<depthPrePass>
#ifdef VERTEXCOLOR
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
#ifdef EMISSIVE
var diffuseBase: vec3f=baseColor.rgb;
#else
var diffuseBase: vec3f= vec3f(0.,0.,0.);
#endif
var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#include<lightFragment>[0..maxSimultaneousLights]
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
`;if(!e.ShadersStoreWGSL[i])e.ShadersStoreWGSL[i]=p;var S=[t,l,m,c,r,s,n,a,d,g,u,f,v];for(let o of S)if(!e.IncludesShadersStoreWGSL[o.name])e.IncludesShadersStoreWGSL[o.name]=o.shader;var O={name:i,shader:p};export{O as gradientPixelShaderWGSL};

//# debugId=490AA75FF74355DF64756E2164756E21
//# sourceMappingURL=gradient.fragment-v812fcwy.js.map
