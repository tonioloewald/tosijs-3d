import{Eh as u}from"./site-mb72han0.js";import{$j as F}from"./site-8f98hfcg.js";import{qy as g}from"./site-72dgepe5.js";import{sy as h}from"./site-md6yscb8.js";import"./site-6gx37fkj.js";import{Dy as s}from"./site-xaz59mrc.js";import{Ey as f}from"./site-70kws73r.js";import"./site-vcpzbmwe.js";import{Gy as d}from"./site-ym5bqgnm.js";import{Ry as p}from"./site-f6yefxyf.js";import{Wy as m}from"./site-stjjqyz5.js";import{Yy as l}from"./site-yygbvmyr.js";import{Zy as c}from"./site-kcwst0gf.js";import{mz as r}from"./site-xr0t1fx0.js";import{nz as t}from"./site-npmkqrmh.js";import{oz as a}from"./site-anrhqzyz.js";import{pz as n}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="shadowOnlyPixelShader",v=`precision highp float;
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

//# debugId=9B5764B2AD171DA964756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-xs3t9367.js.map
