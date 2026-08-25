import{Eh as u}from"./site-mb72han0.js";import{qy as c}from"./site-72dgepe5.js";import{sy as h}from"./site-md6yscb8.js";import"./site-6gx37fkj.js";import{Cy as g}from"./site-0z2v5mk8.js";import{Dy as m}from"./site-xaz59mrc.js";import{Ey as s}from"./site-70kws73r.js";import"./site-vcpzbmwe.js";import{Gy as d}from"./site-ym5bqgnm.js";import{Ry as p}from"./site-f6yefxyf.js";import{Wy as l}from"./site-stjjqyz5.js";import{Zy as f}from"./site-kcwst0gf.js";import{mz as r}from"./site-xr0t1fx0.js";import{nz as t}from"./site-npmkqrmh.js";import{oz as a}from"./site-anrhqzyz.js";import{pz as n}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="gradientPixelShader",v=`precision highp float;uniform vec4 vEyePosition;uniform vec4 topColor;uniform vec4 bottomColor;uniform float offset;uniform float scale;uniform float smoothness;varying vec3 vPositionW;varying vec3 vPosition;
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

//# debugId=3F5CBBF190DDE53064756E2164756E21
//# sourceMappingURL=gradient.fragment-r3yze3gw.js.map
