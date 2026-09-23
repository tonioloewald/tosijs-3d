import{Kz as m}from"./site-5110qmje.js";import{Lz as g}from"./site-v2y5x6nj.js";import{Mz as l}from"./site-16yw12h5.js";import{Sz as f}from"./site-qppa82tt.js";import{jA as r}from"./site-13g8e62p.js";import{kA as o}from"./site-trx32srv.js";import{lA as i}from"./site-3rcgnqcg.js";import{mA as t}from"./site-jjyxr8ne.js";import{FD as n}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var a="gaussianSplattingPixelShader",s=`#include<clipPlaneFragmentDeclaration>
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

//# debugId=8016F9D55022D74164756E2164756E21
//# sourceMappingURL=gaussianSplatting.fragment-42btjxq7.js.map
