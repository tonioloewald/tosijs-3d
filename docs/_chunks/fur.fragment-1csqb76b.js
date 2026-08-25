import{Eh as h}from"./site-mb72han0.js";import{qy as u}from"./site-72dgepe5.js";import{sy as g}from"./site-md6yscb8.js";import"./site-6gx37fkj.js";import{Cy as m}from"./site-0z2v5mk8.js";import{Dy as s}from"./site-xaz59mrc.js";import{Ey as c}from"./site-70kws73r.js";import"./site-vcpzbmwe.js";import{Gy as d}from"./site-ym5bqgnm.js";import{Ry as v}from"./site-f6yefxyf.js";import{Wy as t}from"./site-stjjqyz5.js";import{Zy as l}from"./site-kcwst0gf.js";import{mz as f}from"./site-xr0t1fx0.js";import{nz as a}from"./site-npmkqrmh.js";import{oz as n}from"./site-anrhqzyz.js";import{pz as i}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="furPixelShader",p=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;uniform vec4 furColor;uniform float furLength;varying vec3 vPositionW;varying float vfur_length;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#ifdef DIFFUSE
varying vec2 vDiffuseUV;uniform sampler2D diffuseSampler;uniform vec2 vDiffuseInfos;
#endif
#ifdef HIGHLEVEL
uniform float furOffset;uniform float furOcclusion;uniform sampler2D furTexture;varying vec2 vFurUV;
#endif
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<logDepthDeclaration>
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<fogFragmentDeclaration>
#include<clipPlaneFragmentDeclaration>
float Rand(vec3 rv) {float x=dot(rv,vec3(12.9898,78.233,24.65487));return fract(sin(x)*43758.5453);}
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);vec4 baseColor=furColor;vec3 diffuseColor=vDiffuseColor.rgb;float alpha=vDiffuseColor.a;
#ifdef DIFFUSE
baseColor*=texture2D(diffuseSampler,vDiffuseUV);
#ifdef ALPHATEST
if (baseColor.a<0.4)
discard;
#endif
#include<depthPrePass>
baseColor.rgb*=vDiffuseInfos.y;
#endif
#ifdef VERTEXCOLOR
baseColor.rgb*=vColor.rgb;
#endif
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
#ifdef HIGHLEVEL
vec4 furTextureColor=texture2D(furTexture,vec2(vFurUV.x,vFurUV.y));if (furTextureColor.a<=0.0 || furTextureColor.g<furOffset) {discard;}
float occlusion=mix(0.0,furTextureColor.b*1.2,furOffset);baseColor=vec4(baseColor.xyz*max(occlusion,furOcclusion),1.1-furOffset);
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float glossiness=0.;float aggShadow=0.;float numLights=0.;
#ifdef SPECULARTERM
vec3 specularBase=vec3(0.,0.,0.);
#endif
#include<lightFragment>[0..maxSimultaneousLights]
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
vec3 finalDiffuse=clamp(diffuseBase.rgb*baseColor.rgb,0.0,1.0);
#ifdef HIGHLEVEL
vec4 color=vec4(finalDiffuse,alpha);
#else
float r=vfur_length/furLength*0.5;vec4 color=vec4(finalDiffuse*(0.5+r),alpha);
#endif
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStore[r])e.ShadersStore[r]=p;var C=[t,s,c,l,u,d,f,i,n,m,g,v,a,h];for(let o of C)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var R={name:r,shader:p};export{R as furPixelShader};

//# debugId=6B63C4E01B3BC2E664756E2164756E21
//# sourceMappingURL=fur.fragment-1csqb76b.js.map
