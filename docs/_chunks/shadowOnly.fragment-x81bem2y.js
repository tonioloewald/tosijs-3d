import{Kn}from"./site-5v6fh38j.js";import{At}from"./site-5fxhqekr.js";import{se}from"./site-82m1a6bm.js";import{Ie,Pe,ei}from"./site-0s5mt9av.js";import{di}from"./site-2qc6mc9n.js";import{Li}from"./site-y8zesf4b.js";import{Me,Re}from"./site-m86zv189.js";import{H}from"./site-rze70emw.js";import{st,lt}from"./site-3558k5nx.js";import{it}from"./site-zcgrc802.js";import{Ci}from"../hydrate-25dr1c0j.js";import{i}from"./site-1yf4ncc8.js";var o="shadowOnlyPixelShader",n=`precision highp float;
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
}`;if(!i.ShadersStore[o])i.ShadersStore[o]=n;var r=[Kn,At,se,Ie,Pe,Li,ei,Me,H,st,Re,di,it,lt,Ci];for(let e of r)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var D={name:o,shader:n};export{D as shadowOnlyPixelShader};

//# debugId=29486B66CA88166F64756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-x81bem2y.js.map
