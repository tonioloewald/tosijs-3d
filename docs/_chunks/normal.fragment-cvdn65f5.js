import{Jh as v}from"./site-vbmzes3p.js";import{kz as s}from"./site-1v50gmcm.js";import{mz as u}from"./site-mqydpzdg.js";import"./site-089spfjt.js";import{tz as g}from"./site-cbnxyekq.js";import"./site-7k1e6xhd.js";import{vz as d}from"./site-3ge4xpng.js";import{wz as m}from"./site-95fb8q6z.js";import{xz as c}from"./site-7tmgtqgj.js";import{Hz as f}from"./site-md667va8.js";import{Vz as h}from"./site-9e7z0b37.js";import{Wz as t}from"./site-p2z3c7py.js";import{AA as l}from"./site-gczq6jz1.js";import{BA as n}from"./site-gk9v6jt8.js";import{CA as a}from"./site-akv2qr8m.js";import{DA as r}from"./site-yzj5pcwj.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="normalPixelShader",p=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#ifdef LIGHTING
#include<helperFunctions>
#include<__decl__lightFragment>[0]
#include<__decl__lightFragment>[1]
#include<__decl__lightFragment>[2]
#include<__decl__lightFragment>[3]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#endif
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
#ifdef NORMAL
baseColor=mix(baseColor,vec4(vNormalW,1.0),0.5);
#endif
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
#ifdef LIGHTING
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float glossiness=0.;float aggShadow=0.;float numLights=0.;
#include<lightFragment>[0]
#include<lightFragment>[1]
#include<lightFragment>[2]
#include<lightFragment>[3]
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;
#else
vec3 finalDiffuse= baseColor.rgb;
#endif
vec4 color=vec4(finalDiffuse,alpha);
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=p;var F=[f,m,c,s,d,r,t,n,a,g,u,h,l,v];for(let i of F)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var U={name:o,shader:p};export{U as normalPixelShader};

//# debugId=EF03C3C1BB97C40C64756E2164756E21
//# sourceMappingURL=normal.fragment-cvdn65f5.js.map
