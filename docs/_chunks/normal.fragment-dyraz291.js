import{Hh as v}from"./site-6nv8hjp9.js";import{iz as s}from"./site-49z6nh39.js";import{kz as u}from"./site-1zaw3xsb.js";import"./site-y2r4e2kj.js";import{rz as g}from"./site-6m4aagt7.js";import"./site-tk5je7pd.js";import{tz as d}from"./site-99g3bkr2.js";import{uz as m}from"./site-6jttm5w8.js";import{vz as c}from"./site-z6q3x0pt.js";import{Fz as f}from"./site-4grmvsrj.js";import{Tz as h}from"./site-wmwpetg4.js";import{Uz as t}from"./site-zqq9zg2d.js";import{yA as l}from"./site-drqg20zy.js";import{zA as n}from"./site-ejkzt0hp.js";import{AA as a}from"./site-mtwqybh7.js";import{BA as r}from"./site-ja5kdh4m.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="normalPixelShader",p=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;varying vec3 vPositionW;
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

//# debugId=48FFC37A8987C89064756E2164756E21
//# sourceMappingURL=normal.fragment-dyraz291.js.map
