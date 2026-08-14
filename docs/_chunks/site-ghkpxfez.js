import{Jy as B}from"./site-mcyaspcb.js";import{Ky as C}from"./site-c8qrcs4c.js";import{Ry as E}from"./site-29567zt9.js";import{Wy as z}from"./site-2ywb8x5w.js";import{Zy as A}from"./site-7fsb8rv3.js";import{mz as w}from"./site-2db1xmdt.js";import{nz as y}from"./site-rfcgcv9w.js";import{oz as x}from"./site-yh10kg8k.js";import{pz as v}from"./site-b7qcx2vd.js";import{_B as b}from"./site-1q3afg48.js";var q="particlesPixelShader",G=`#ifdef LOGARITHMICDEPTH
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

//# debugId=A6AB9C7B27614F6664756E2164756E21
//# sourceMappingURL=site-ghkpxfez.js.map
