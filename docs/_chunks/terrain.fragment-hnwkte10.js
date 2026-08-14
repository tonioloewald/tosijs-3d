import{Bh as H}from"./site-y8r977x5.js";import{Pz as z}from"./site-cpqzy51y.js";import{Rz as C}from"./site-hndgxdg8.js";import{Zz as B}from"./site-gvnrjj0h.js";import{_z as y}from"./site-4yv0qmr9.js";import"./site-4gewpr5c.js";import{aA as A}from"./site-mfy2m7vn.js";import"./site-qr2bwqkn.js";import{gA as E}from"./site-1w2bjfmq.js";import{jA as w}from"./site-0asqx2x4.js";import{kA as x}from"./site-jzegcmyz.js";import{EA as k}from"./site-wy8z6msz.js";import{FA as v}from"./site-h2yr8kje.js";import{GA as q}from"./site-g0mfbjb2.js";import{HA as j}from"./site-gh3wrscr.js";import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var h="terrainPixelShader",I=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;
#ifdef SPECULARTERM
uniform vSpecularColor: vec4f;
#endif
varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0..maxSimultaneousLights]
#ifdef DIFFUSE
varying vTextureUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform vTextureInfos: vec2f;var diffuse1SamplerSampler: sampler;var diffuse1Sampler: texture_2d<f32>;var diffuse2SamplerSampler: sampler;var diffuse2Sampler: texture_2d<f32>;var diffuse3SamplerSampler: sampler;var diffuse3Sampler: texture_2d<f32>;uniform diffuse1Infos: vec2f;uniform diffuse2Infos: vec2f;uniform diffuse3Infos: vec2f;
#endif
#ifdef BUMP
var bump1SamplerSampler: sampler;var bump1Sampler: texture_2d<f32>;var bump2SamplerSampler: sampler;var bump2Sampler: texture_2d<f32>;var bump3SamplerSampler: sampler;var bump3Sampler: texture_2d<f32>;
#endif
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef BUMP
fn cotangent_frame(normal: vec3f,p: vec3f,uv: vec2f)->mat3x3f
{var dp1: vec3f=dpdx(p);var dp2: vec3f=dpdy(p);var duv1: vec2f=dpdx(uv);var duv2: vec2f=dpdy(uv);var dp2perp: vec3f=cross(dp2,normal);var dp1perp: vec3f=cross(normal,dp1);var tangent: vec3f=dp2perp*duv1.x+dp1perp*duv2.x;var binormal: vec3f=dp2perp*duv1.y+dp1perp*duv2.y;var invmax: f32=inverseSqrt(max(dot(tangent,tangent),dot(binormal,binormal)));return mat3x3f(tangent*invmax,binormal*invmax,normal);}
fn perturbNormal(viewDir: vec3f,mixColor: vec3f)->vec3f
{var bump1Color: vec3f=textureSample(bump1Sampler,bump1SamplerSampler,fragmentInputs.vTextureUV*uniforms.diffuse1Infos).xyz;var bump2Color: vec3f=textureSample(bump2Sampler,bump2SamplerSampler,fragmentInputs.vTextureUV*uniforms.diffuse2Infos).xyz;var bump3Color: vec3f=textureSample(bump3Sampler,bump3SamplerSampler,fragmentInputs.vTextureUV*uniforms.diffuse3Infos).xyz;bump1Color=bump1Color.rgb*mixColor.r;bump2Color=mix(bump1Color.rgb,bump2Color.rgb,vec3f(mixColor.g));var map: vec3f=mix(bump2Color.rgb,bump3Color.rgb,vec3f(mixColor.b));map=map*255./127.-128./127.;var TBN: mat3x3f=cotangent_frame(fragmentInputs.vNormalW*uniforms.vTextureInfos.y,-viewDir,fragmentInputs.vTextureUV);return normalize(TBN*map);}
#endif
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var baseColor: vec4f= vec4f(1.,1.,1.,1.);var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;
#ifdef SPECULARTERM
var glossiness: f32=uniforms.vSpecularColor.a;var specularColor: vec3f=uniforms.vSpecularColor.rgb;
#else
var glossiness: f32=0.;
#endif
var alpha: f32=uniforms.vDiffuseColor.a;
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
#ifdef DIFFUSE
baseColor=textureSample(textureSampler,textureSamplerSampler,fragmentInputs.vTextureUV);
#if defined(BUMP) && defined(DIFFUSE)
normalW=perturbNormal(viewDirectionW,baseColor.rgb);
#endif
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
#include<depthPrePass>
baseColor=vec4f(baseColor.rgb*uniforms.vTextureInfos.y,baseColor.a);var diffuse1Color: vec4f=textureSample(diffuse1Sampler,diffuse1SamplerSampler,fragmentInputs.vTextureUV*uniforms.diffuse1Infos);var diffuse2Color: vec4f=textureSample(diffuse2Sampler,diffuse2SamplerSampler,fragmentInputs.vTextureUV*uniforms.diffuse2Infos);var diffuse3Color: vec4f=textureSample(diffuse3Sampler,diffuse3SamplerSampler,fragmentInputs.vTextureUV*uniforms.diffuse3Infos);diffuse1Color=vec4f(diffuse1Color.rgb*baseColor.r,diffuse1Color.a);diffuse2Color=vec4f(mix(diffuse1Color.rgb,diffuse2Color.rgb,vec3f(baseColor.g)),diffuse2Color.a);baseColor=vec4f(mix(diffuse2Color.rgb,diffuse3Color.rgb,vec3f(baseColor.b)),baseColor.a);
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var aggShadow: f32=0.;var numLights: f32=0.;
#ifdef SPECULARTERM
var specularBase: vec3f= vec3f(0.,0.,0.);
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
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor*baseColor.rgb,vec3f(0.0),vec3f(1.0));var color: vec4f= vec4f(finalDiffuse+finalSpecular,alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=I;var J=[w,y,z,A,j,x,k,q,B,C,E,v,H];for(let f of J)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var d={name:h,shader:I};export{d as terrainPixelShaderWGSL};

//# debugId=46950F647A02BCB164756E2164756E21
//# sourceMappingURL=terrain.fragment-hnwkte10.js.map
