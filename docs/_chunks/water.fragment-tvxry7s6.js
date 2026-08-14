import{qy as J}from"./site-rhcjdg2c.js";import{sy as N}from"./site-3vsjdfr6.js";import"./site-fdyjdt1j.js";import{Dy as G}from"./site-rs9dnmcg.js";import{Ey as H}from"./site-6x55xt9x.js";import"./site-7vf9z82k.js";import{Gy as K}from"./site-4ntpg8e0.js";import{Jy as L}from"./site-mcyaspcb.js";import{Ky as M}from"./site-c8qrcs4c.js";import{Ry as O}from"./site-29567zt9.js";import{Wy as C}from"./site-2ywb8x5w.js";import{Zy as E}from"./site-7fsb8rv3.js";import{mz as z}from"./site-2db1xmdt.js";import{nz as B}from"./site-rfcgcv9w.js";import{oz as A}from"./site-yh10kg8k.js";import{pz as x}from"./site-b7qcx2vd.js";import{_B as k}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var v="waterPixelShader",Q=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;
#ifdef SPECULARTERM
uniform vec4 vSpecularColor;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<helperFunctions>
#include<imageProcessingDeclaration>
#include<imageProcessingFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#ifdef BUMP
varying vec2 vNormalUV;
#ifdef BUMPSUPERIMPOSE
varying vec2 vNormalUV2;
#endif
uniform sampler2D normalSampler;uniform vec2 vNormalInfos;
#endif
uniform sampler2D refractionSampler;uniform sampler2D reflectionSampler;const float LOG2=1.442695;uniform vec3 cameraPosition;uniform vec4 waterColor;uniform float colorBlendFactor;uniform vec4 waterColor2;uniform float colorBlendFactor2;uniform float bumpHeight;uniform float time;varying vec3 vRefractionMapTexCoord;varying vec3 vReflectionMapTexCoord;
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);vec4 baseColor=vec4(1.,1.,1.,1.);vec3 diffuseColor=vDiffuseColor.rgb;float alpha=vDiffuseColor.a;
#ifdef BUMP
#ifdef BUMPSUPERIMPOSE
baseColor=0.6*texture2D(normalSampler,vNormalUV)+0.4*texture2D(normalSampler,vec2(vNormalUV2.x,vNormalUV2.y));
#else
baseColor=texture2D(normalSampler,vNormalUV);
#endif
vec3 bumpColor=baseColor.rgb;
#ifdef ALPHATEST
if (baseColor.a<0.4)
discard;
#endif
baseColor.rgb*=vNormalInfos.y;
#else
vec3 bumpColor=vec3(1.0);
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor.rgb*=vColor.rgb;
#endif
#ifdef NORMAL
vec2 perturbation=bumpHeight*(baseColor.rg-0.5);
#ifdef BUMPAFFECTSREFLECTION
vec3 normalW=normalize(vNormalW+vec3(perturbation.x*8.0,0.0,perturbation.y*8.0));if (normalW.y<0.0) {normalW.y=-normalW.y;}
#else
vec3 normalW=normalize(vNormalW);
#endif
#else
vec3 normalW=vec3(1.0,1.0,1.0);vec2 perturbation=bumpHeight*(vec2(1.0,1.0)-0.5);
#endif
#ifdef FRESNELSEPARATE
#ifdef REFLECTION
vec2 projectedRefractionTexCoords=clamp(vRefractionMapTexCoord.xy/vRefractionMapTexCoord.z+perturbation*0.5,0.0,1.0);vec4 refractiveColor=texture2D(refractionSampler,projectedRefractionTexCoords);
#ifdef IS_REFRACTION_LINEAR
refractiveColor.rgb=toGammaSpace(refractiveColor.rgb);
#endif
vec2 projectedReflectionTexCoords=vec2(
vReflectionMapTexCoord.x/vReflectionMapTexCoord.z+perturbation.x*0.3,
vReflectionMapTexCoord.y/vReflectionMapTexCoord.z+perturbation.y
);vec4 reflectiveColor=texture2D(reflectionSampler,projectedReflectionTexCoords);
#ifdef IS_REFLECTION_LINEAR
reflectiveColor.rgb=toGammaSpace(reflectiveColor.rgb);
#endif
vec3 upVector=vec3(0.0,1.0,0.0);float fresnelTerm=clamp(abs(pow(dot(viewDirectionW,upVector),3.0)),0.05,0.65);float IfresnelTerm=1.0-fresnelTerm;refractiveColor=colorBlendFactor*waterColor+(1.0-colorBlendFactor)*refractiveColor;reflectiveColor=IfresnelTerm*colorBlendFactor2*waterColor+(1.0-colorBlendFactor2*IfresnelTerm)*reflectiveColor;vec4 combinedColor=refractiveColor*fresnelTerm+reflectiveColor*IfresnelTerm;baseColor=combinedColor;
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float aggShadow=0.;float numLights=0.;
#ifdef SPECULARTERM
float glossiness=vSpecularColor.a;vec3 specularBase=vec3(0.,0.,0.);vec3 specularColor=vSpecularColor.rgb;
#else
float glossiness=0.;
#endif
#include<lightFragment>[0..maxSimultaneousLights]
vec3 finalDiffuse=clamp(baseColor.rgb,0.0,1.0);
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
#ifdef SPECULARTERM
vec3 finalSpecular=specularBase*specularColor;
#else
vec3 finalSpecular=vec3(0.0);
#endif
#else 
#ifdef REFLECTION
vec2 projectedRefractionTexCoords=clamp(vRefractionMapTexCoord.xy/vRefractionMapTexCoord.z+perturbation,0.0,1.0);vec4 refractiveColor=texture2D(refractionSampler,projectedRefractionTexCoords);
#ifdef IS_REFRACTION_LINEAR
refractiveColor.rgb=toGammaSpace(refractiveColor.rgb);
#endif
vec2 projectedReflectionTexCoords=vReflectionMapTexCoord.xy/vReflectionMapTexCoord.z+perturbation;vec4 reflectiveColor=texture2D(reflectionSampler,projectedReflectionTexCoords);
#ifdef IS_REFLECTION_LINEAR
reflectiveColor.rgb=toGammaSpace(reflectiveColor.rgb);
#endif
vec3 upVector=vec3(0.0,1.0,0.0);float fresnelTerm=max(dot(viewDirectionW,upVector),0.0);vec4 combinedColor=refractiveColor*fresnelTerm+reflectiveColor*(1.0-fresnelTerm);baseColor=colorBlendFactor*waterColor+(1.0-colorBlendFactor)*combinedColor;
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float aggShadow=0.;float numLights=0.;
#ifdef SPECULARTERM
float glossiness=vSpecularColor.a;vec3 specularBase=vec3(0.,0.,0.);vec3 specularColor=vSpecularColor.rgb;
#else
float glossiness=0.;
#endif
#include<lightFragment>[0..maxSimultaneousLights]
vec3 finalDiffuse=clamp(baseColor.rgb,0.0,1.0);
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
#ifdef SPECULARTERM
vec3 finalSpecular=specularBase*specularColor;
#else
vec3 finalSpecular=vec3(0.0);
#endif
#endif
vec4 color=vec4(finalDiffuse+finalSpecular,alpha);
#include<logDepthFragment>
#include<fogFragment>
#ifdef IMAGEPROCESSINGPOSTPROCESS
color.rgb=toLinearSpace(color.rgb);
#elif defined(IMAGEPROCESSING)
color.rgb=toLinearSpace(color.rgb);color=applyImageProcessing(color);
#endif
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!k.ShadersStore[v])k.ShadersStore[v]=Q;var R=[C,L,M,G,H,J,K,x,E,z,A,N,O,B];for(let q of R)if(!k.IncludesShadersStore[q.name])k.IncludesShadersStore[q.name]=q.shader;var P={name:v,shader:Q};export{P as waterPixelShader};

//# debugId=79412079DF0936E764756E2164756E21
//# sourceMappingURL=water.fragment-tvxry7s6.js.map
