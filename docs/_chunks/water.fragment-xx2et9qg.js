import{uy as m}from"./site-7cj3v9zr.js";import{wy as d}from"./site-ky2h5skg.js";import"./site-m8r24xkf.js";import{Dy as v}from"./site-rrktqvx7.js";import{Ey as c}from"./site-3ncekbhz.js";import"./site-tqvce48x.js";import{Ly as s}from"./site-rn3vxmce.js";import{My as p}from"./site-ejyrxdxm.js";import{Kz as u}from"./site-7yz9j1tz.js";import{Nz as l}from"./site-apq8y78s.js";import{Qz as t}from"./site-sskzjsez.js";import{hA as f}from"./site-ccnx75p9.js";import{iA as i}from"./site-jb4tcghj.js";import{jA as n}from"./site-dqtvr7cx.js";import{kA as a}from"./site-cmgd7mz2.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="waterPixelShader",S=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;
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
#include<imageProcessingDeclaration>
#include<imageProcessingFunctions>
#include<lightUboDeclaration>[0..maxSimultaneousLights]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#ifdef BUMP
varying vNormalUV: vec2f;
#ifdef BUMPSUPERIMPOSE
varying vNormalUV2: vec2f;
#endif
var normalSamplerSampler: sampler;var normalSampler: texture_2d<f32>;uniform vNormalInfos: vec2f;
#endif
var refractionSamplerSampler: sampler;var refractionSampler: texture_2d<f32>;var reflectionSamplerSampler: sampler;var reflectionSampler: texture_2d<f32>;const LOG2: f32=1.442695;uniform cameraPosition: vec3f;uniform waterColor: vec4f;uniform colorBlendFactor: f32;uniform waterColor2: vec4f;uniform colorBlendFactor2: f32;uniform bumpHeight: f32;uniform time: f32;varying vRefractionMapTexCoord: vec3f;varying vReflectionMapTexCoord: vec3f;
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
#ifdef BUMP
#ifdef BUMPSUPERIMPOSE
baseColor=0.6*textureSample(normalSampler,normalSamplerSampler,fragmentInputs.vNormalUV)+0.4*textureSample(normalSampler,normalSamplerSampler, vec2f(fragmentInputs.vNormalUV2.x,fragmentInputs.vNormalUV2.y));
#else
baseColor=textureSample(normalSampler,normalSamplerSampler,fragmentInputs.vNormalUV);
#endif
var bumpColor: vec3f=baseColor.rgb;
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
baseColor=vec4f(baseColor.rgb*uniforms.vNormalInfos.y,baseColor.a);
#else
var bumpColor: vec3f= vec3f(1.0);
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor=vec4f(baseColor.rgb*fragmentInputs.vColor.rgb,baseColor.a);
#endif
#ifdef NORMAL
var perturbation: vec2f=uniforms.bumpHeight*(baseColor.rg-0.5);
#ifdef BUMPAFFECTSREFLECTION
var normalW: vec3f=normalize(fragmentInputs.vNormalW+ vec3f(perturbation.x*8.0,0.0,perturbation.y*8.0));if (normalW.y<0.0) {normalW.y=-normalW.y;}
#else
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#endif
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);var perturbation: vec2f=uniforms.bumpHeight*( vec2f(1.0,1.0)-0.5);
#endif
#ifdef FRESNELSEPARATE
#ifdef REFLECTION
var projectedRefractionTexCoords: vec2f=clamp(fragmentInputs.vRefractionMapTexCoord.xy/fragmentInputs.vRefractionMapTexCoord.z+perturbation*0.5, vec2f(0.0), vec2f(1.0));var refractiveColor: vec4f=textureSample(refractionSampler,refractionSamplerSampler,projectedRefractionTexCoords);
#ifdef IS_REFRACTION_LINEAR
refractiveColor=vec4f(toGammaSpace(refractiveColor.rgb),refractiveColor.a);
#endif
var projectedReflectionTexCoords: vec2f= vec2f(
fragmentInputs.vReflectionMapTexCoord.x/fragmentInputs.vReflectionMapTexCoord.z+perturbation.x*0.3,
fragmentInputs.vReflectionMapTexCoord.y/fragmentInputs.vReflectionMapTexCoord.z+perturbation.y
);var reflectiveColor: vec4f=textureSample(reflectionSampler,reflectionSamplerSampler,projectedReflectionTexCoords);
#ifdef IS_REFLECTION_LINEAR
reflectiveColor=vec4f(toGammaSpace(reflectiveColor.rgb),reflectiveColor.a);
#endif
var upVector: vec3f= vec3f(0.0,1.0,0.0);var fresnelTerm: f32=clamp(abs(pow(dot(viewDirectionW,upVector),3.0)),0.05,0.65);var IfresnelTerm: f32=1.0-fresnelTerm;refractiveColor=uniforms.colorBlendFactor*uniforms.waterColor+(1.0-uniforms.colorBlendFactor)*refractiveColor;reflectiveColor=IfresnelTerm*uniforms.colorBlendFactor2*uniforms.waterColor+(1.0-uniforms.colorBlendFactor2*IfresnelTerm)*reflectiveColor;var combinedColor: vec4f=refractiveColor*fresnelTerm+reflectiveColor*IfresnelTerm;baseColor=combinedColor;
#endif
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var aggShadow: f32=0.;var numLights: f32=0.;
#ifdef SPECULARTERM
var glossiness: f32=uniforms.vSpecularColor.a;var specularBase: vec3f= vec3f(0.,0.,0.);var specularColor: vec3f=uniforms.vSpecularColor.rgb;
#else
var glossiness: f32=0.;
#endif
#include<lightFragment>[0..maxSimultaneousLights]
var finalDiffuse: vec3f=clamp(baseColor.rgb,vec3f(0.0),vec3f(1.0));
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=fragmentInputs.vColor.a;
#endif
#ifdef SPECULARTERM
var finalSpecular: vec3f=specularBase*specularColor;
#else
var finalSpecular: vec3f= vec3f(0.0);
#endif
#else 
#ifdef REFLECTION
var projectedRefractionTexCoords: vec2f=clamp(fragmentInputs.vRefractionMapTexCoord.xy/fragmentInputs.vRefractionMapTexCoord.z+perturbation, vec2f(0.0), vec2f(1.0));var refractiveColor: vec4f=textureSample(refractionSampler,refractionSamplerSampler,projectedRefractionTexCoords);
#ifdef IS_REFRACTION_LINEAR
refractiveColor=vec4f(toGammaSpace(refractiveColor.rgb),refractiveColor.a);
#endif
var projectedReflectionTexCoords: vec2f=fragmentInputs.vReflectionMapTexCoord.xy/fragmentInputs.vReflectionMapTexCoord.z+perturbation;var reflectiveColor: vec4f=textureSample(reflectionSampler,reflectionSamplerSampler,projectedReflectionTexCoords);
#ifdef IS_REFLECTION_LINEAR
reflectiveColor=vec4f(toGammaSpace(reflectiveColor.rgb),reflectiveColor.a);
#endif
var upVector: vec3f= vec3f(0.0,1.0,0.0);var fresnelTerm: f32=max(dot(viewDirectionW,upVector),0.0);var combinedColor: vec4f=refractiveColor*fresnelTerm+reflectiveColor*(1.0-fresnelTerm);baseColor=uniforms.colorBlendFactor*uniforms.waterColor+(1.0-uniforms.colorBlendFactor)*combinedColor;
#endif
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var aggShadow: f32=0.;var numLights: f32=0.;
#ifdef SPECULARTERM
var glossiness: f32=uniforms.vSpecularColor.a;var specularBase: vec3f= vec3f(0.,0.,0.);var specularColor: vec3f=uniforms.vSpecularColor.rgb;
#else
var glossiness: f32=0.;
#endif
#include<lightFragment>[0..maxSimultaneousLights]
var finalDiffuse: vec3f=clamp(baseColor.rgb,vec3f(0.0),vec3f(1.0));
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=fragmentInputs.vColor.a;
#endif
#ifdef SPECULARTERM
var finalSpecular: vec3f=specularBase*specularColor;
#else
var finalSpecular: vec3f= vec3f(0.0);
#endif
#endif
var color: vec4f= vec4f(finalDiffuse+finalSpecular,alpha);
#include<logDepthFragment>
#include<fogFragment>
#ifdef IMAGEPROCESSINGPOSTPROCESS
color=vec4f(toLinearSpaceVec3(color.rgb),color.a);
#elif defined(IMAGEPROCESSING)
color=vec4f(toLinearSpaceVec3(color.rgb),color.a);color=applyImageProcessing(color);
#endif
fragmentOutputs.color=color;
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=S;var C=[l,s,p,c,m,v,a,t,f,n,d,u,i];for(let r of C)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var O={name:o,shader:S};export{O as waterPixelShaderWGSL};

//# debugId=92EC7FB6F8D7AA7F64756E2164756E21
//# sourceMappingURL=water.fragment-xx2et9qg.js.map
