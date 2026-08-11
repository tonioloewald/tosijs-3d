import{Eh as R}from"./site-ah8hapzy.js";import{$j as Q}from"./site-ahc9286m.js";import{qy as L}from"./site-0njkfyq3.js";import{sy as N}from"./site-nnjax1p2.js";import"./site-p7tb0fk3.js";import{Dy as J}from"./site-atd54w7j.js";import{Ey as K}from"./site-wnfkq0sz.js";import"./site-aeme12pw.js";import{Gy as M}from"./site-8eg5gf3m.js";import{Ry as O}from"./site-5mec8xk8.js";import{Wy as G}from"./site-58j2ewnw.js";import{Yy as E}from"./site-ggwxysr4.js";import{Zy as H}from"./site-vnstybdd.js";import{mz as z}from"./site-2bfnsn9v.js";import{nz as B}from"./site-f9x4gp6z.js";import{oz as A}from"./site-fdg03zpz.js";import{pz as x}from"./site-ex7cky94.js";import{_B as k}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var v="shadowOnlyPixelShader",T=`precision highp float;
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

//# debugId=B235ABFC702D6C2C64756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-benmpfm6.js.map
