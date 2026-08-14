import{Eh as R}from"./site-hjjfj5xf.js";import{$j as Q}from"./site-n224ze3v.js";import{qy as L}from"./site-rhcjdg2c.js";import{sy as N}from"./site-3vsjdfr6.js";import"./site-fdyjdt1j.js";import{Dy as J}from"./site-rs9dnmcg.js";import{Ey as K}from"./site-6x55xt9x.js";import"./site-7vf9z82k.js";import{Gy as M}from"./site-4ntpg8e0.js";import{Ry as O}from"./site-29567zt9.js";import{Wy as G}from"./site-2ywb8x5w.js";import{Yy as E}from"./site-vsp6hkzp.js";import{Zy as H}from"./site-7fsb8rv3.js";import{mz as z}from"./site-2db1xmdt.js";import{nz as B}from"./site-rfcgcv9w.js";import{oz as A}from"./site-yh10kg8k.js";import{pz as x}from"./site-b7qcx2vd.js";import{_B as k}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var v="shadowOnlyPixelShader",T=`precision highp float;
#include<__decl__sceneFragment>
uniform float alpha;uniform vec3 shadowColor;varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
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
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float glossiness=0.;float aggShadow=0.;float numLights=0.;
#include<lightFragment>[0..1]
vec4 color=vec4(shadowColor,(1.0-clamp(shadow,0.,1.))*alpha);
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!k.ShadersStore[v])k.ShadersStore[v]=T;var V=[Q,E,G,J,K,L,M,x,H,z,A,N,O,B,R];for(let q of V)if(!k.IncludesShadersStore[q.name])k.IncludesShadersStore[q.name]=q.shader;var p={name:v,shader:T};export{p as shadowOnlyPixelShader};

//# debugId=47FC9EB7F8026B9364756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-82ypeccw.js.map
