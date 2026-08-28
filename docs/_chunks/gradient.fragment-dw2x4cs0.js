import{Hh as u}from"./site-6nv8hjp9.js";import{iz as c}from"./site-49z6nh39.js";import{kz as h}from"./site-1zaw3xsb.js";import"./site-y2r4e2kj.js";import{rz as g}from"./site-6m4aagt7.js";import"./site-tk5je7pd.js";import{tz as d}from"./site-99g3bkr2.js";import{uz as m}from"./site-6jttm5w8.js";import{vz as s}from"./site-z6q3x0pt.js";import{Fz as l}from"./site-4grmvsrj.js";import{Tz as p}from"./site-wmwpetg4.js";import{Uz as f}from"./site-zqq9zg2d.js";import{yA as t}from"./site-drqg20zy.js";import{zA as r}from"./site-ejkzt0hp.js";import{AA as a}from"./site-mtwqybh7.js";import{BA as n}from"./site-ja5kdh4m.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var i="gradientPixelShader",v=`precision highp float;uniform vec4 vEyePosition;uniform vec4 topColor;uniform vec4 bottomColor;uniform float offset;uniform float scale;uniform float smoothness;varying vec3 vPositionW;varying vec3 vPosition;
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

//# debugId=7EB74F6C011F12D764756E2164756E21
//# sourceMappingURL=gradient.fragment-dw2x4cs0.js.map
