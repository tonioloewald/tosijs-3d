import{Pz as A}from"./site-cpqzy51y.js";import{Rz as C}from"./site-hndgxdg8.js";import{_z as z}from"./site-4yv0qmr9.js";import"./site-4gewpr5c.js";import{aA as B}from"./site-mfy2m7vn.js";import"./site-qr2bwqkn.js";import{gA as E}from"./site-1w2bjfmq.js";import{jA as x}from"./site-0asqx2x4.js";import{kA as y}from"./site-jzegcmyz.js";import{mA as w}from"./site-mvqptzb8.js";import{EA as k}from"./site-wy8z6msz.js";import{FA as v}from"./site-h2yr8kje.js";import{GA as q}from"./site-g0mfbjb2.js";import{HA as j}from"./site-gh3wrscr.js";import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var h="shadowOnlyPixelShader",H=`#include<sceneUboDeclaration>
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
`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=H;var I=[w,x,z,A,B,j,y,k,q,C,E,v];for(let f of I)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var _={name:h,shader:H};export{_ as shadowOnlyPixelShaderWGSL};

//# debugId=784B7CFB420F8A4664756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-sj01ptbf.js.map
