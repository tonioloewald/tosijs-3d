import{Iz as m}from"./site-pqcw4hy3.js";import{Jz as g}from"./site-e9fs7cz4.js";import{Kz as l}from"./site-7yz9j1tz.js";import{Qz as f}from"./site-sskzjsez.js";import{hA as r}from"./site-ccnx75p9.js";import{iA as o}from"./site-jb4tcghj.js";import{jA as i}from"./site-dqtvr7cx.js";import{kA as t}from"./site-cmgd7mz2.js";import{DD as n}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var a="gaussianSplattingPixelShader",s=`#include<clipPlaneFragmentDeclaration>
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

//# debugId=301F11FAE10F89E464756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-avxpx88g.js.map
