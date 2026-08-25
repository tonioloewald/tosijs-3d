import{Eh as v}from"./site-mb72han0.js";import{qy as s}from"./site-72dgepe5.js";import{sy as u}from"./site-md6yscb8.js";import"./site-6gx37fkj.js";import{Cy as g}from"./site-0z2v5mk8.js";import{Dy as m}from"./site-xaz59mrc.js";import{Ey as c}from"./site-70kws73r.js";import"./site-vcpzbmwe.js";import{Gy as d}from"./site-ym5bqgnm.js";import{Ry as h}from"./site-f6yefxyf.js";import{Wy as f}from"./site-stjjqyz5.js";import{Zy as t}from"./site-kcwst0gf.js";import{mz as n}from"./site-xr0t1fx0.js";import{nz as l}from"./site-npmkqrmh.js";import{oz as a}from"./site-anrhqzyz.js";import{pz as r}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="normalPixelShader",p=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;varying vec3 vPositionW;
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

//# debugId=115B8B67D205BA6F64756E2164756E21
//# sourceMappingURL=normal.fragment-czqmk8ga.js.map
