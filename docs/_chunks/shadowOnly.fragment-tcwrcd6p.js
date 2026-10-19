import{io}from"./site-gp6dsxzt.js";import{It}from"./site-czh58v68.js";import{ne}from"./site-nhzwk4kt.js";import{Me,De,ni}from"./site-0b210stx.js";import{gi}from"./site-avz6g4zq.js";import{Ui}from"./site-vb79fgh0.js";import{Ne,Ie}from"./site-wna4ceqy.js";import{Y}from"./site-kthp3mjc.js";import{at,dt}from"./site-8046enz4.js";import{nt}from"./site-pb09yakm.js";import{Ei}from"../hydrate-spgdbsg3.js";import{i}from"./site-1yf4ncc8.js";var o="shadowOnlyPixelShader",n=`precision highp float;
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
}`;if(!i.ShadersStore[o])i.ShadersStore[o]=n;var r=[io,It,ne,Me,De,Ui,ni,Ne,Y,at,Ie,gi,nt,dt,Ei];for(let e of r)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var D={name:o,shader:n};export{D as shadowOnlyPixelShader};

//# debugId=2ABE702227ED9F5E64756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-tcwrcd6p.js.map
