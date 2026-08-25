import{Ny as m}from"./site-7gtvq69a.js";import{Oy as g}from"./site-s6qzsvbs.js";import{gA as l}from"./site-p3qvxbqn.js";import{kA as f}from"./site-ngcgfsjk.js";import{EA as r}from"./site-j1mr7gyn.js";import{FA as o}from"./site-kcvb8kks.js";import{GA as i}from"./site-4ghhz517.js";import{HA as t}from"./site-42gdhacc.js";import{_B as n}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var a="gaussianSplattingPixelShader",s=`#include<clipPlaneFragmentDeclaration>
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
`;if(!n.ShadersStoreWGSL[a])n.ShadersStoreWGSL[a]=s;var c=[t,f,r,g,l,o,m,i];for(let e of c)if(!n.IncludesShadersStoreWGSL[e.name])n.IncludesShadersStoreWGSL[e.name]=e.shader;var _={name:a,shader:s};export{_ as gaussianSplattingPixelShaderWGSL};

//# debugId=ABCA2C0256B09F5C64756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-akday5rn.js.map
