import{Eh as S}from"./site-mb72han0.js";import{qy as s}from"./site-72dgepe5.js";import{sy as p}from"./site-md6yscb8.js";import"./site-6gx37fkj.js";import{Cy as u}from"./site-0z2v5mk8.js";import{Dy as d}from"./site-xaz59mrc.js";import{Ey as m}from"./site-70kws73r.js";import"./site-vcpzbmwe.js";import{Gy as c}from"./site-ym5bqgnm.js";import{Ry as g}from"./site-f6yefxyf.js";import{Wy as l}from"./site-stjjqyz5.js";import{Zy as t}from"./site-kcwst0gf.js";import{mz as o}from"./site-xr0t1fx0.js";import{nz as f}from"./site-npmkqrmh.js";import{oz as n}from"./site-anrhqzyz.js";import{pz as a}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="triplanarPixelShader",v=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;
#ifdef SPECULARTERM
uniform vec4 vSpecularColor;
#endif
varying vec3 vPositionW;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#ifdef DIFFUSEX
varying vec2 vTextureUVX;uniform sampler2D diffuseSamplerX;
#ifdef BUMPX
uniform sampler2D normalSamplerX;
#endif
#endif
#ifdef DIFFUSEY
varying vec2 vTextureUVY;uniform sampler2D diffuseSamplerY;
#ifdef BUMPY
uniform sampler2D normalSamplerY;
#endif
#endif
#ifdef DIFFUSEZ
varying vec2 vTextureUVZ;uniform sampler2D diffuseSamplerZ;
#ifdef BUMPZ
uniform sampler2D normalSamplerZ;
#endif
#endif
#ifdef NORMAL
varying mat3 tangentSpace;
#endif
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<logDepthDeclaration>
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);vec4 baseColor=vec4(0.,0.,0.,1.);vec3 diffuseColor=vDiffuseColor.rgb;float alpha=vDiffuseColor.a;
#ifdef NORMAL
vec3 normalW=tangentSpace[2];
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
vec4 baseNormal=vec4(0.0,0.0,0.0,1.0);normalW*=normalW;
#ifdef DIFFUSEX
baseColor+=texture2D(diffuseSamplerX,vTextureUVX)*normalW.x;
#ifdef BUMPX
baseNormal+=texture2D(normalSamplerX,vTextureUVX)*normalW.x;
#endif
#endif
#ifdef DIFFUSEY
baseColor+=texture2D(diffuseSamplerY,vTextureUVY)*normalW.y;
#ifdef BUMPY
baseNormal+=texture2D(normalSamplerY,vTextureUVY)*normalW.y;
#endif
#endif
#ifdef DIFFUSEZ
baseColor+=texture2D(diffuseSamplerZ,vTextureUVZ)*normalW.z;
#ifdef BUMPZ
baseNormal+=texture2D(normalSamplerZ,vTextureUVZ)*normalW.z;
#endif
#endif
#ifdef NORMAL
normalW=normalize((2.0*baseNormal.xyz-1.0)*tangentSpace);
#endif
#ifdef ALPHATEST
if (baseColor.a<0.4)
discard;
#endif
#include<depthPrePass>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor.rgb*=vColor.rgb;
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float aggShadow=0.;float numLights=0.;
#ifdef SPECULARTERM
float glossiness=vSpecularColor.a;vec3 specularBase=vec3(0.,0.,0.);vec3 specularColor=vSpecularColor.rgb;
#else
float glossiness=0.;
#endif
#include<lightFragment>[0..maxSimultaneousLights]
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
#ifdef SPECULARTERM
vec3 finalSpecular=specularBase*specularColor;
#else
vec3 finalSpecular=vec3(0.0);
#endif
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor,0.0,1.0)*baseColor.rgb;vec4 color=vec4(finalDiffuse+finalSpecular,alpha);
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=v;var C=[l,d,m,t,s,c,a,o,n,u,p,g,f,S];for(let i of C)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var O={name:r,shader:v};export{O as triplanarPixelShader};

//# debugId=7CCF267C2566403064756E2164756E21
//# sourceMappingURL=triplanar.fragment-7g8jnp9g.js.map
