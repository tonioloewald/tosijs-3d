import{Ny as z}from"./site-3g486e04.js";import{Oy as y}from"./site-akkkv5va.js";import{gA as x}from"./site-1j237ehx.js";import{kA as w}from"./site-8w3m2z52.js";import{EA as k}from"./site-jzahp02c.js";import{FA as v}from"./site-psb0h7wx.js";import{GA as q}from"./site-wyyxpgba.js";import{HA as j}from"./site-42jeewt0.js";import{_B as b}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var h="gaussianSplattingPixelShader",A=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vColor: vec4f;varying vPosition: vec2f;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var finalColor: vec4f=gaussianColor(input.vColor,input.vPosition);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
fragmentOutputs.fragData0=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
fragmentOutputs.fragData1=pack(fragmentInputs.position.z);
#else
fragmentOutputs.fragData1=vec4f(fragmentInputs.position.z,0.0,0.0,1.0);
#endif
#else
fragmentOutputs.color=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=A;var B=[j,w,k,y,x,v,z,q];for(let f of B)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var Q={name:h,shader:A};export{Q as gaussianSplattingPixelShaderWGSL};

//# debugId=1B57EDA78CB249D564756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-m33zk0h8.js.map
