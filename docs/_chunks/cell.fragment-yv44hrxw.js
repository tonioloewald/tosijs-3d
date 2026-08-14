import{Bh as H}from"./site-y8r977x5.js";import{Pz as z}from"./site-cpqzy51y.js";import{Rz as C}from"./site-hndgxdg8.js";import{Zz as B}from"./site-gvnrjj0h.js";import{_z as y}from"./site-4yv0qmr9.js";import"./site-4gewpr5c.js";import{aA as A}from"./site-mfy2m7vn.js";import"./site-qr2bwqkn.js";import{gA as E}from"./site-1w2bjfmq.js";import{jA as w}from"./site-0asqx2x4.js";import{kA as x}from"./site-jzegcmyz.js";import{EA as k}from"./site-wy8z6msz.js";import{FA as v}from"./site-h2yr8kje.js";import{GA as q}from"./site-g0mfbjb2.js";import{HA as j}from"./site-gh3wrscr.js";import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var h="cellPixelShader",I=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0..maxSimultaneousLights]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;uniform vDiffuseInfos: vec2f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
fn computeCustomDiffuseLighting(info: lightingInfo,diffuseBaseIn: vec3f,shadow: f32)->vec3f
{var diffuseBase: vec3f=info.diffuse*shadow;
#ifdef CELLBASIC
var level: f32=1.0;if (info.ndl<0.5) {level=0.5;}
diffuseBase=diffuseBase.rgb* vec3f(level,level,level);
#else
var ToonThresholds: array<f32,4>;ToonThresholds[0]=0.95;ToonThresholds[1]=0.5;ToonThresholds[2]=0.2;ToonThresholds[3]=0.03;var ToonBrightnessLevels: array<f32,5>;ToonBrightnessLevels[0]=1.0;ToonBrightnessLevels[1]=0.8;ToonBrightnessLevels[2]=0.6;ToonBrightnessLevels[3]=0.35;ToonBrightnessLevels[4]=0.2;if (info.ndl>ToonThresholds[0])
{diffuseBase=diffuseBase.rgb*ToonBrightnessLevels[0];}
else if (info.ndl>ToonThresholds[1])
{diffuseBase=diffuseBase.rgb*ToonBrightnessLevels[1];}
else if (info.ndl>ToonThresholds[2])
{diffuseBase=diffuseBase.rgb*ToonBrightnessLevels[2];}
else if (info.ndl>ToonThresholds[3])
{diffuseBase=diffuseBase.rgb*ToonBrightnessLevels[3];}
else
{diffuseBase=diffuseBase.rgb*ToonBrightnessLevels[4];}
#endif
return max(diffuseBase, vec3f(0.2));}
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
#ifdef VERTEXCOLOR
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
var info: lightingInfo;var diffuseBase: vec3f= vec3f(0.,0.,0.);var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#ifdef SPECULARTERM
var specularBase: vec3f= vec3f(0.,0.,0.);
#endif
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
`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=I;var J=[w,y,z,A,j,x,k,q,B,C,E,v,H];for(let f of J)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var d={name:h,shader:I};export{d as cellPixelShaderWGSL};

//# debugId=0605CA5A00B5A08164756E2164756E21
//# sourceMappingURL=cell.fragment-yv44hrxw.js.map
