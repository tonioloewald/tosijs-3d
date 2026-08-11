import{Jy as B}from"./site-xt9984b7.js";import{Ky as C}from"./site-f571hc4v.js";import{Ry as E}from"./site-5mec8xk8.js";import{Wy as z}from"./site-58j2ewnw.js";import{Zy as A}from"./site-vnstybdd.js";import{mz as w}from"./site-2bfnsn9v.js";import{nz as y}from"./site-f9x4gp6z.js";import{oz as x}from"./site-fdg03zpz.js";import{pz as v}from"./site-ex7cky94.js";import{_B as b}from"./site-7jxv124x.js";var q="particlesPixelShader",G=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
varying vec2 vUV;varying vec4 vColor;uniform vec4 textureMask;uniform sampler2D diffuseSampler;
#include<clipPlaneFragmentDeclaration>
#include<imageProcessingDeclaration>
#include<logDepthDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#ifdef RAMPGRADIENT
varying vec4 remapRanges;uniform sampler2D rampSampler;
#endif
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 textureColor=texture2D(diffuseSampler,vUV);vec4 baseColor=(textureColor*textureMask+(vec4(1.,1.,1.,1.)-textureMask))*vColor;
#ifdef RAMPGRADIENT
float alpha=baseColor.a;float remappedColorIndex=clamp((alpha-remapRanges.x)/remapRanges.y,0.0,1.0);vec4 rampColor=texture2D(rampSampler,vec2(1.0-remappedColorIndex,0.));baseColor.rgb*=rampColor.rgb;float finalAlpha=baseColor.a;baseColor.a=clamp((alpha*rampColor.a-remapRanges.z)/remapRanges.w,0.0,1.0);
#endif
#ifdef BLENDMULTIPLYMODE
float sourceAlpha=vColor.a*textureColor.a;baseColor.rgb=baseColor.rgb*sourceAlpha+vec3(1.0)*(1.0-sourceAlpha);
#endif
#include<logDepthFragment>
#include<fogFragment>(color,baseColor)
#ifdef IMAGEPROCESSINGPOSTPROCESS
baseColor.rgb=toLinearSpace(baseColor.rgb);
#else
#ifdef IMAGEPROCESSING
baseColor.rgb=toLinearSpace(baseColor.rgb);baseColor=applyImageProcessing(baseColor);
#endif
#endif
gl_FragColor=baseColor;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStore[q])b.ShadersStore[q]=G;var H=[v,B,A,z,C,w,x,E,y];for(let k of H)if(!b.IncludesShadersStore[k.name])b.IncludesShadersStore[k.name]=k.shader;var V={name:q,shader:G};
export{V as lh};

//# debugId=C40ACF910ADEC30E64756E2164756E21
//# sourceMappingURL=site-4pm091w2.js.map
