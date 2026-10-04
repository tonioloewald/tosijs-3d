import{Me,Re}from"./site-m86zv189.js";import{H}from"./site-rze70emw.js";import{st,lt}from"./site-3558k5nx.js";import{_n,rd}from"./site-2x7kfbns.js";import{it}from"./site-zcgrc802.js";import{i}from"./site-1yf4ncc8.js";var e="gaussianSplattingPixelShader",o=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_DEPTH
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vec4 vColor;varying vec2 vPosition;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
void main () {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 finalColor=gaussianColor(vColor);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
glFragData[0]=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!i.ShadersStore[e])i.ShadersStore[e]=o;var n=[Me,H,st,_n,it,lt,rd,Re];for(let a of n)if(!i.IncludesShadersStore[a.name])i.IncludesShadersStore[a.name]=a.shader;var F={name:e,shader:o};export{F as gaussianSplattingPixelShader};

//# debugId=ABDFE2927465B00464756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-9f2w0wpn.js.map
