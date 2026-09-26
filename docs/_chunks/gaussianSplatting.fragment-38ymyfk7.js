import{xe,ve}from"./site-t5na8t3j.js";import{W}from"./site-6bak08eg.js";import{tt,Ye}from"./site-m1s81bf3.js";import{Dn,Ql}from"./site-aryp3ds6.js";import{We}from"./site-cr62e97z.js";import{i}from"./site-1yf4ncc8.js";var e="gaussianSplattingPixelShader",a=`#include<clipPlaneFragmentDeclaration>
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
`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=a;var t=[xe,W,tt,Dn,We,Ye,Ql,ve];for(let n of t)if(!i.IncludesShadersStoreWGSL[n.name])i.IncludesShadersStoreWGSL[n.name]=n.shader;var S={name:e,shader:a};export{S as gaussianSplattingPixelShaderWGSL};

//# debugId=46DE1F2F3048947664756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-38ymyfk7.js.map
