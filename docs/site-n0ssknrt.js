import{gA as v}from"./site-1j237ehx.js";import{kA as q}from"./site-8w3m2z52.js";import{GA as k}from"./site-wyyxpgba.js";import{HA as j}from"./site-42jeewt0.js";import{_B as b}from"./site-7jxv124x.js";var h="outlinePixelShader",w=`uniform color: vec4f;
#ifdef ALPHATEST
varying vUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vUV).a<0.4) {discard;}
#endif
#include<logDepthFragment>
fragmentOutputs.color=uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStoreWGSL[h])b.ShadersStoreWGSL[h]=w;var x=[j,q,k,v];for(let f of x)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var E={name:h,shader:w};
export{E as Pg};

//# debugId=C5341F373DE5E8C164756E2164756E21
//# sourceMappingURL=site-n0ssknrt.js.map
