import{Pz as s}from"./site-pc7wx50v.js";import{Rz as d}from"./site-gggacazs.js";import{_z as c}from"./site-3njbfktn.js";import"./site-s8vfkdrs.js";import{aA as g}from"./site-10kj1b29.js";import"./site-b510f2ch.js";import{gA as u}from"./site-p3qvxbqn.js";import{jA as m}from"./site-t4ayqvvy.js";import{kA as f}from"./site-ngcgfsjk.js";import{mA as l}from"./site-1nn7frmg.js";import{EA as a}from"./site-j1mr7gyn.js";import{FA as t}from"./site-kcvb8kks.js";import{GA as i}from"./site-4ghhz517.js";import{HA as r}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="shadowOnlyPixelShader",S=`#include<sceneUboDeclaration>
uniform alpha: f32;uniform shadowColor: vec3f;varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0..maxSimultaneousLights]
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
var viewDirectionW: vec3f=normalize(scene.vEyePosition.xyz-fragmentInputs.vPositionW);
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#include<lightFragment>[0..1]
var color: vec4f= vec4f(uniforms.shadowColor,(1.0-clamp(shadow,0.,1.))*uniforms.alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=S;var h=[l,m,c,s,g,r,f,a,i,d,u,t];for(let n of h)if(!e.IncludesShadersStoreWGSL[n.name])e.IncludesShadersStoreWGSL[n.name]=n.shader;var _={name:o,shader:S};export{_ as shadowOnlyPixelShaderWGSL};

//# debugId=B351B8869035F3BA64756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-3pjwm6rk.js.map
