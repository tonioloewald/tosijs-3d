import{gA as v}from"./site-1j237ehx.js";import{kA as q}from"./site-8w3m2z52.js";import{GA as k}from"./site-wyyxpgba.js";import{HA as j}from"./site-42jeewt0.js";import{_B as b}from"./site-7jxv124x.js";var h="linePixelShader",w=`#include<clipPlaneFragmentDeclaration>
uniform color: vec4f;
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<logDepthFragment>
#include<clipPlaneFragment>
fragmentOutputs.color=uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=w;var x=[j,q,v,k];for(let f of x)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var E={name:h,shader:w};
export{E as Xg};

//# debugId=B772636A99C9690E64756E2164756E21
//# sourceMappingURL=site-8nykq7cw.js.map
