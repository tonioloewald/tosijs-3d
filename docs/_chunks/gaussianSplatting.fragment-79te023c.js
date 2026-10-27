import{Te,Ce}from"./site-5red3kgf.js";import{X}from"./site-vka3s0eg.js";import{st,Ke}from"./site-k22r8w0h.js";import{go,Yc}from"./site-3zp26g3g.js";import{Qe}from"./site-me8s7je1.js";import{i}from"./site-1yf4ncc8.js";var e="gaussianSplattingPixelShader",a=`#include<clipPlaneFragmentDeclaration>
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
`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=a;var t=[Te,X,st,go,Qe,Ke,Yc,Ce];for(let n of t)if(!i.IncludesShadersStoreWGSL[n.name])i.IncludesShadersStoreWGSL[n.name]=n.shader;var S={name:e,shader:a};export{S as gaussianSplattingPixelShaderWGSL};

//# debugId=7651809D1975E00364756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-79te023c.js.map
