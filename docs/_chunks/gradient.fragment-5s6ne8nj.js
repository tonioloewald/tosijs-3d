import{ne}from"./site-nhzwk4kt.js";import{De,Le,ai,Li}from"./site-mehfgswz.js";import{bi}from"./site-axdex52q.js";import{Wi}from"./site-swg7wgc2.js";import{Be,Oe}from"./site-82r6bc2x.js";import{X}from"./site-z6szqkpd.js";import{at,dt}from"./site-8046enz4.js";import{nt}from"./site-pb09yakm.js";import{Ii}from"../hydrate-d5cbj3ft.js";import{i}from"./site-1yf4ncc8.js";var o="gradientPixelShader",n=`precision highp float;uniform vec4 vEyePosition;uniform vec4 topColor;uniform vec4 bottomColor;uniform float offset;uniform float scale;uniform float smoothness;varying vec3 vPositionW;varying vec3 vPosition;
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
`;if(!i.ShadersStore[o])i.ShadersStore[o]=n;var r=[ne,De,Le,Wi,ai,Be,X,at,Oe,Li,bi,nt,dt,Ii];for(let e of r)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var _={name:o,shader:n};export{_ as gradientPixelShader};

//# debugId=D9E852A1E45971C364756E2164756E21
//# sourceMappingURL=gradient.fragment-5s6ne8nj.js.map
