import{Eh as Q}from"./site-hjjfj5xf.js";import{qy as K}from"./site-rhcjdg2c.js";import{sy as N}from"./site-3vsjdfr6.js";import"./site-fdyjdt1j.js";import{Cy as M}from"./site-5gw47k71.js";import{Dy as H}from"./site-rs9dnmcg.js";import{Ey as J}from"./site-6x55xt9x.js";import"./site-7vf9z82k.js";import{Gy as L}from"./site-4ntpg8e0.js";import{Ry as O}from"./site-29567zt9.js";import{Wy as E}from"./site-2ywb8x5w.js";import{Zy as G}from"./site-7fsb8rv3.js";import{mz as z}from"./site-2db1xmdt.js";import{nz as B}from"./site-rfcgcv9w.js";import{oz as A}from"./site-yh10kg8k.js";import{pz as x}from"./site-b7qcx2vd.js";import{_B as k}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var v="simplePixelShader",R=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#ifdef DIFFUSE
varying vec2 vDiffuseUV;uniform sampler2D diffuseSampler;uniform vec2 vDiffuseInfos;
#endif
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
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);vec4 baseColor=vec4(1.,1.,1.,1.);vec3 diffuseColor=vDiffuseColor.rgb;float alpha=vDiffuseColor.a;
#ifdef DIFFUSE
baseColor=texture2D(diffuseSampler,vDiffuseUV);
#ifdef ALPHATEST
if (baseColor.a<0.4)
discard;
#endif
#include<depthPrePass>
baseColor.rgb*=vDiffuseInfos.y;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor.rgb*=vColor.rgb;
#endif
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float glossiness=0.;float aggShadow=0.;float numLights=0.;
#ifdef SPECULARTERM
vec3 specularBase=vec3(0.,0.,0.);
#endif 
#include<lightFragment>[0..maxSimultaneousLights]
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;vec4 color=vec4(finalDiffuse,alpha);
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!k.ShadersStore[v])k.ShadersStore[v]=R;var T=[E,H,J,K,L,x,G,z,A,M,N,O,B,Q];for(let q of T)if(!k.IncludesShadersStore[q.name])k.IncludesShadersStore[q.name]=q.shader;var u={name:v,shader:R};export{u as simplePixelShader};

//# debugId=7180ED8F758444A264756E2164756E21
//# sourceMappingURL=simple.fragment-hde9a5jy.js.map
