import{Hh as u}from"./site-6nv8hjp9.js";import{Sj as F}from"./site-5ppyq5z1.js";import{iz as g}from"./site-49z6nh39.js";import{kz as h}from"./site-1zaw3xsb.js";import"./site-y2r4e2kj.js";import"./site-tk5je7pd.js";import{tz as d}from"./site-99g3bkr2.js";import{uz as s}from"./site-6jttm5w8.js";import{vz as f}from"./site-z6q3x0pt.js";import{Fz as m}from"./site-4grmvsrj.js";import{Hz as l}from"./site-t3aad17c.js";import{Tz as p}from"./site-wmwpetg4.js";import{Uz as c}from"./site-zqq9zg2d.js";import{yA as t}from"./site-drqg20zy.js";import{zA as r}from"./site-ejkzt0hp.js";import{AA as a}from"./site-mtwqybh7.js";import{BA as n}from"./site-ja5kdh4m.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var i="shadowOnlyPixelShader",v=`precision highp float;
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

//# debugId=2FAB1566A6525C0164756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-vaa3e8de.js.map
