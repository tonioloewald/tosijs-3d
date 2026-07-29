import{Eh as Q}from"./site-ah8hapzy.js";import{qy as K}from"./site-0njkfyq3.js";import{sy as N}from"./site-nnjax1p2.js";import"./site-p7tb0fk3.js";import{Cy as M}from"./site-t0yknckb.js";import{Dy as H}from"./site-atd54w7j.js";import{Ey as J}from"./site-wnfkq0sz.js";import"./site-aeme12pw.js";import{Gy as L}from"./site-8eg5gf3m.js";import{Ry as O}from"./site-5mec8xk8.js";import{Wy as E}from"./site-58j2ewnw.js";import{Zy as G}from"./site-vnstybdd.js";import{mz as z}from"./site-2bfnsn9v.js";import{nz as B}from"./site-f9x4gp6z.js";import{oz as A}from"./site-fdg03zpz.js";import{pz as x}from"./site-ex7cky94.js";import{_B as k}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var v="mixPixelShader",R=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;
#ifdef SPECULARTERM
uniform vec4 vSpecularColor;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#ifdef DIFFUSE
varying vec2 vTextureUV;uniform sampler2D mixMap1Sampler;uniform vec2 vTextureInfos;
#ifdef MIXMAP2
uniform sampler2D mixMap2Sampler;
#endif
uniform sampler2D diffuse1Sampler;uniform sampler2D diffuse2Sampler;uniform sampler2D diffuse3Sampler;uniform sampler2D diffuse4Sampler;uniform vec2 diffuse1Infos;uniform vec2 diffuse2Infos;uniform vec2 diffuse3Infos;uniform vec2 diffuse4Infos;
#ifdef MIXMAP2
uniform sampler2D diffuse5Sampler;uniform sampler2D diffuse6Sampler;uniform sampler2D diffuse7Sampler;uniform sampler2D diffuse8Sampler;uniform vec2 diffuse5Infos;uniform vec2 diffuse6Infos;uniform vec2 diffuse7Infos;uniform vec2 diffuse8Infos;
#endif
#endif
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);vec4 finalMixColor=vec4(1.,1.,1.,1.);vec3 diffuseColor=vDiffuseColor.rgb;
#ifdef MIXMAP2
vec4 mixColor2=vec4(1.,1.,1.,1.);
#endif
#ifdef SPECULARTERM
float glossiness=vSpecularColor.a;vec3 specularColor=vSpecularColor.rgb;
#else
float glossiness=0.;
#endif
float alpha=vDiffuseColor.a;
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
#ifdef DIFFUSE
vec4 mixColor=texture2D(mixMap1Sampler,vTextureUV);
#include<depthPrePass>
mixColor.rgb*=vTextureInfos.y;vec4 diffuse1Color=texture2D(diffuse1Sampler,vTextureUV*diffuse1Infos);vec4 diffuse2Color=texture2D(diffuse2Sampler,vTextureUV*diffuse2Infos);vec4 diffuse3Color=texture2D(diffuse3Sampler,vTextureUV*diffuse3Infos);vec4 diffuse4Color=texture2D(diffuse4Sampler,vTextureUV*diffuse4Infos);diffuse1Color.rgb*=mixColor.r;diffuse2Color.rgb=mix(diffuse1Color.rgb,diffuse2Color.rgb,mixColor.g);diffuse3Color.rgb=mix(diffuse2Color.rgb,diffuse3Color.rgb,mixColor.b);finalMixColor.rgb=mix(diffuse3Color.rgb,diffuse4Color.rgb,1.0-mixColor.a);
#ifdef MIXMAP2
mixColor=texture2D(mixMap2Sampler,vTextureUV);mixColor.rgb*=vTextureInfos.y;vec4 diffuse5Color=texture2D(diffuse5Sampler,vTextureUV*diffuse5Infos);vec4 diffuse6Color=texture2D(diffuse6Sampler,vTextureUV*diffuse6Infos);vec4 diffuse7Color=texture2D(diffuse7Sampler,vTextureUV*diffuse7Infos);vec4 diffuse8Color=texture2D(diffuse8Sampler,vTextureUV*diffuse8Infos);diffuse5Color.rgb=mix(finalMixColor.rgb,diffuse5Color.rgb,mixColor.r);diffuse6Color.rgb=mix(diffuse5Color.rgb,diffuse6Color.rgb,mixColor.g);diffuse7Color.rgb=mix(diffuse6Color.rgb,diffuse7Color.rgb,mixColor.b);finalMixColor.rgb=mix(diffuse7Color.rgb,diffuse8Color.rgb,1.0-mixColor.a);
#endif
#endif
#ifdef VERTEXCOLOR
finalMixColor.rgb*=vColor.rgb;
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float aggShadow=0.;float numLights=0.;
#ifdef SPECULARTERM
vec3 specularBase=vec3(0.,0.,0.);
#endif
#include<lightFragment>[0..maxSimultaneousLights]
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
#ifdef SPECULARTERM
vec3 finalSpecular=specularBase*specularColor;
#else
vec3 finalSpecular=vec3(0.0);
#endif
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor*finalMixColor.rgb,0.0,1.0);vec4 color=vec4(finalDiffuse+finalSpecular,alpha);
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!k.ShadersStore[v])k.ShadersStore[v]=R;var T=[E,H,J,K,L,x,G,z,A,M,N,O,B,Q];for(let q of T)if(!k.IncludesShadersStore[q.name])k.IncludesShadersStore[q.name]=q.shader;var u={name:v,shader:R};export{u as mixPixelShader};

//# debugId=4FE9F8C52930FD7264756E2164756E21
//# sourceMappingURL=mix.fragment-nwgt5bfb.js.map
