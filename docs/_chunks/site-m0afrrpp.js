import{Kz as o}from"./site-7yz9j1tz.js";import{Qz as i}from"./site-sskzjsez.js";import{jA as t}from"./site-dqtvr7cx.js";import{kA as a}from"./site-cmgd7mz2.js";import{DD as e}from"./site-53d1aqt6.js";var n="outlinePixelShader",l=`uniform color: vec4f;
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
}`;if(!e.ShadersStoreWGSL[n])e.ShadersStoreWGSL[n]=l;var f=[a,i,t,o];for(let r of f)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var s={name:n,shader:l};
export{s as Gg};

//# debugId=FF7A7B172317C86864756E2164756E21
//# sourceMappingURL=site-m0afrrpp.js.map
