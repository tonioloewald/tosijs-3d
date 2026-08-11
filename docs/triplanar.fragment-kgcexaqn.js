import{Bh as H}from"./site-yr354tke.js";import{Pz as z}from"./site-4bvxnwrk.js";import{Rz as C}from"./site-phg19k2m.js";import{Zz as B}from"./site-da9kwetk.js";import{_z as y}from"./site-zb7yzqcb.js";import"./site-gwx05bya.js";import{aA as A}from"./site-aw4tgypf.js";import"./site-gyvf98zt.js";import{gA as E}from"./site-1j237ehx.js";import{jA as w}from"./site-9xy7s866.js";import{kA as x}from"./site-8w3m2z52.js";import{EA as k}from"./site-jzahp02c.js";import{FA as v}from"./site-psb0h7wx.js";import{GA as q}from"./site-wyyxpgba.js";import{HA as j}from"./site-42jeewt0.js";import{_B as b}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var h="triplanarPixelShader",I=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;
#ifdef SPECULARTERM
uniform vSpecularColor: vec4f;
#endif
varying vPositionW: vec3f;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0..maxSimultaneousLights]
#ifdef DIFFUSEX
varying vTextureUVX: vec2f;var diffuseSamplerXSampler: sampler;var diffuseSamplerX: texture_2d<f32>;
#ifdef BUMPX
var normalSamplerXSampler: sampler;var normalSamplerX: texture_2d<f32>;
#endif
#endif
#ifdef DIFFUSEY
varying vTextureUVY: vec2f;var diffuseSamplerYSampler: sampler;var diffuseSamplerY: texture_2d<f32>;
#ifdef BUMPY
var normalSamplerYSampler: sampler;var normalSamplerY: texture_2d<f32>;
#endif
#endif
#ifdef DIFFUSEZ
varying vTextureUVZ: vec2f;var diffuseSamplerZSampler: sampler;var diffuseSamplerZ: texture_2d<f32>;
#ifdef BUMPZ
var normalSamplerZSampler: sampler;var normalSamplerZ: texture_2d<f32>;
#endif
#endif
#ifdef NORMAL
varying tangentSpace0: vec3f;varying tangentSpace1: vec3f;varying tangentSpace2: vec3f;
#endif
#include<logDepthDeclaration>
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var baseColor: vec4f= vec4f(0.,0.,0.,1.);var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;var alpha: f32=uniforms.vDiffuseColor.a;
#ifdef NORMAL
var normalW: vec3f=fragmentInputs.tangentSpace2;
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
var baseNormal: vec4f= vec4f(0.0,0.0,0.0,1.0);normalW=normalW*normalW;
#ifdef DIFFUSEX
baseColor=baseColor+textureSample(diffuseSamplerX,diffuseSamplerXSampler,fragmentInputs.vTextureUVX)*normalW.x;
#ifdef BUMPX
baseNormal=baseNormal+textureSample(normalSamplerX,normalSamplerXSampler,fragmentInputs.vTextureUVX)*normalW.x;
#endif
#endif
#ifdef DIFFUSEY
baseColor=baseColor+textureSample(diffuseSamplerY,diffuseSamplerYSampler,fragmentInputs.vTextureUVY)*normalW.y;
#ifdef BUMPY
baseNormal=baseNormal+textureSample(normalSamplerY,normalSamplerYSampler,fragmentInputs.vTextureUVY)*normalW.y;
#endif
#endif
#ifdef DIFFUSEZ
baseColor=baseColor+textureSample(diffuseSamplerZ,diffuseSamplerZSampler,fragmentInputs.vTextureUVZ)*normalW.z;
#ifdef BUMPZ
baseNormal=baseNormal+textureSample(normalSamplerZ,normalSamplerZSampler,fragmentInputs.vTextureUVZ)*normalW.z;
#endif
#endif
#ifdef NORMAL
var tangentSpace: mat3x3f=mat3x3f(fragmentInputs.tangentSpace0,fragmentInputs.tangentSpace1,fragmentInputs.tangentSpace2);normalW=normalize((2.0*baseNormal.xyz-1.0)*tangentSpace);
#endif
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
#include<depthPrePass>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var aggShadow: f32=0.;var numLights: f32=0.;
#ifdef SPECULARTERM
var glossiness: f32=uniforms.vSpecularColor.a;var specularBase: vec3f= vec3f(0.,0.,0.);var specularColor: vec3f=uniforms.vSpecularColor.rgb;
#else
var glossiness: f32=0.;
#endif
#include<lightFragment>[0..maxSimultaneousLights]
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=fragmentInputs.vColor.a;
#endif
#ifdef SPECULARTERM
var finalSpecular: vec3f=specularBase*specularColor;
#else
var finalSpecular: vec3f= vec3f(0.0);
#endif
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;var color: vec4f= vec4f(finalDiffuse+finalSpecular,alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=I;var J=[w,y,x,z,A,j,k,q,B,C,E,v,H];for(let f of J)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var d={name:h,shader:I};export{d as triplanarPixelShaderWGSL};

//# debugId=CEEA96D8CD846B5A64756E2164756E21
//# sourceMappingURL=triplanar.fragment-kgcexaqn.js.map
