import{Pz as A}from"./site-4bvxnwrk.js";import{Rz as C}from"./site-phg19k2m.js";import{_z as z}from"./site-zb7yzqcb.js";import"./site-gwx05bya.js";import{aA as B}from"./site-aw4tgypf.js";import"./site-gyvf98zt.js";import{gA as E}from"./site-1j237ehx.js";import{jA as x}from"./site-9xy7s866.js";import{kA as y}from"./site-8w3m2z52.js";import{mA as w}from"./site-8j04nt09.js";import{EA as k}from"./site-jzahp02c.js";import{FA as v}from"./site-psb0h7wx.js";import{GA as q}from"./site-wyyxpgba.js";import{HA as j}from"./site-42jeewt0.js";import{_B as b}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var h="shadowOnlyPixelShader",H=`#include<sceneUboDeclaration>
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

//# debugId=A36FA05531C6A94264756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-kxxa0f2r.js.map
