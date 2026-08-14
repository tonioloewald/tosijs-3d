import{Bh as H}from"./site-y8r977x5.js";import{Pz as z}from"./site-cpqzy51y.js";import{Rz as C}from"./site-hndgxdg8.js";import{Zz as B}from"./site-gvnrjj0h.js";import{_z as y}from"./site-4yv0qmr9.js";import"./site-4gewpr5c.js";import{aA as A}from"./site-mfy2m7vn.js";import"./site-qr2bwqkn.js";import{gA as E}from"./site-1w2bjfmq.js";import{jA as w}from"./site-0asqx2x4.js";import{kA as x}from"./site-jzegcmyz.js";import{EA as k}from"./site-wy8z6msz.js";import{FA as v}from"./site-h2yr8kje.js";import{GA as q}from"./site-g0mfbjb2.js";import{HA as j}from"./site-gh3wrscr.js";import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var h="furPixelShader",I=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;uniform furColor: vec4f;uniform furLength: f32;varying vPositionW: vec3f;varying vfur_length: f32;
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
`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=I;var J=[w,y,x,z,A,k,j,q,B,C,E,v,H];for(let f of J)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var d={name:h,shader:I};export{d as furPixelShaderWGSL};

//# debugId=AE2CD7A9A5B2E4AB64756E2164756E21
//# sourceMappingURL=fur.fragment-2ah4ss5p.js.map
