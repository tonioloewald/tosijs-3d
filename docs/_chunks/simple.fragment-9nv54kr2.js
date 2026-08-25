import{Eh as p}from"./site-mb72han0.js";import{qy as m}from"./site-72dgepe5.js";import{sy as u}from"./site-md6yscb8.js";import"./site-6gx37fkj.js";import{Cy as g}from"./site-0z2v5mk8.js";import{Dy as d}from"./site-xaz59mrc.js";import{Ey as s}from"./site-70kws73r.js";import"./site-vcpzbmwe.js";import{Gy as c}from"./site-ym5bqgnm.js";import{Ry as v}from"./site-f6yefxyf.js";import{Wy as l}from"./site-stjjqyz5.js";import{Zy as t}from"./site-kcwst0gf.js";import{mz as r}from"./site-xr0t1fx0.js";import{nz as a}from"./site-npmkqrmh.js";import{oz as f}from"./site-anrhqzyz.js";import{pz as n}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="simplePixelShader",h=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;varying vec3 vPositionW;
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
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=h;var S=[l,d,s,m,c,n,t,r,f,g,u,v,a,p];for(let i of S)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var y={name:o,shader:h};export{y as simplePixelShader};

//# debugId=7CD5B2D105EEA2ED64756E2164756E21
//# sourceMappingURL=simple.fragment-9nv54kr2.js.map
