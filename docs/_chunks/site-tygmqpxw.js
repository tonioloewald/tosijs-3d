import{gA as v}from"./site-1w2bjfmq.js";import{kA as q}from"./site-jzegcmyz.js";import{GA as k}from"./site-g0mfbjb2.js";import{HA as j}from"./site-gh3wrscr.js";import{_B as b}from"./site-1q3afg48.js";var h="linePixelShader",w=`#include<clipPlaneFragmentDeclaration>
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

//# debugId=CA12034AC3507B9564756E2164756E21
//# sourceMappingURL=site-tygmqpxw.js.map
