import{Jh as u}from"./site-vbmzes3p.js";import{kz as c}from"./site-1v50gmcm.js";import{mz as h}from"./site-mqydpzdg.js";import"./site-089spfjt.js";import{tz as g}from"./site-cbnxyekq.js";import"./site-7k1e6xhd.js";import{vz as d}from"./site-3ge4xpng.js";import{wz as m}from"./site-95fb8q6z.js";import{xz as s}from"./site-7tmgtqgj.js";import{Hz as l}from"./site-md667va8.js";import{Vz as p}from"./site-9e7z0b37.js";import{Wz as f}from"./site-p2z3c7py.js";import{AA as t}from"./site-gczq6jz1.js";import{BA as r}from"./site-gk9v6jt8.js";import{CA as a}from"./site-akv2qr8m.js";import{DA as n}from"./site-yzj5pcwj.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var i="gradientPixelShader",v=`precision highp float;uniform vec4 vEyePosition;uniform vec4 topColor;uniform vec4 bottomColor;uniform float offset;uniform float scale;uniform float smoothness;varying vec3 vPositionW;varying vec3 vPosition;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0]
#include<__decl__lightFragment>[1]
#include<__decl__lightFragment>[2]
#include<__decl__lightFragment>[3]
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
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);float h=vPosition.y*scale+offset;float mysmoothness=clamp(smoothness,0.01,max(smoothness,10.));vec4 baseColor=mix(bottomColor,topColor,max(pow(max(h,0.0),mysmoothness),0.0));vec3 diffuseColor=baseColor.rgb;float alpha=baseColor.a;
#ifdef ALPHATEST
if (baseColor.a<0.4)
discard;
#endif
#include<depthPrePass>
#ifdef VERTEXCOLOR
baseColor.rgb*=vColor.rgb;
#endif
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
#ifdef EMISSIVE
vec3 diffuseBase=baseColor.rgb;
#else
vec3 diffuseBase=vec3(0.,0.,0.);
#endif
lightingInfo info;float shadow=1.;float glossiness=0.;float aggShadow=0.;float numLights=0.;
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
}
`;if(!e.ShadersStore[i])e.ShadersStore[i]=v;var C=[l,m,s,c,d,n,f,r,a,g,h,p,t,u];for(let o of C)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var R={name:i,shader:v};export{R as gradientPixelShader};

//# debugId=5FDEBC8F58A279F964756E2164756E21
//# sourceMappingURL=gradient.fragment-8wawwhn7.js.map
