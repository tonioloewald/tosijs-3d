import{Jh as u}from"./site-vbmzes3p.js";import{Uj as F}from"./site-gv199vjz.js";import{kz as g}from"./site-1v50gmcm.js";import{mz as h}from"./site-mqydpzdg.js";import"./site-089spfjt.js";import"./site-7k1e6xhd.js";import{vz as d}from"./site-3ge4xpng.js";import{wz as s}from"./site-95fb8q6z.js";import{xz as f}from"./site-7tmgtqgj.js";import{Hz as m}from"./site-md667va8.js";import{Jz as l}from"./site-k72q68wn.js";import{Vz as p}from"./site-9e7z0b37.js";import{Wz as c}from"./site-p2z3c7py.js";import{AA as t}from"./site-gczq6jz1.js";import{BA as r}from"./site-gk9v6jt8.js";import{CA as a}from"./site-akv2qr8m.js";import{DA as n}from"./site-yzj5pcwj.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var i="shadowOnlyPixelShader",v=`precision highp float;
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
}`;if(!e.ShadersStore[i])e.ShadersStore[i]=v;var _=[F,l,m,s,f,g,d,n,c,r,a,h,p,t,u];for(let o of _)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var W={name:i,shader:v};export{W as shadowOnlyPixelShader};

//# debugId=E16377E47E65C9D964756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-75rm5jbc.js.map
