import{Jy as s}from"./site-5ghejtqs.js";import{Ky as c}from"./site-9b8qcf3r.js";import{Ry as p}from"./site-f6yefxyf.js";import{Wy as t}from"./site-stjjqyz5.js";import{Zy as m}from"./site-kcwst0gf.js";import{mz as l}from"./site-xr0t1fx0.js";import{nz as i}from"./site-npmkqrmh.js";import{oz as n}from"./site-anrhqzyz.js";import{pz as a}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";var o="particlesPixelShader",f=`#ifdef LOGARITHMICDEPTH
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
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=f;var g=[a,s,m,t,c,l,n,p,i];for(let r of g)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var P={name:o,shader:f};
export{P as lh};

//# debugId=3C761DA8535F20F664756E2164756E21
//# sourceMappingURL=site-7jn9n8nb.js.map
