import{gA as o}from"./site-p3qvxbqn.js";import{kA as i}from"./site-ngcgfsjk.js";import{GA as t}from"./site-4ghhz517.js";import{HA as a}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";var n="outlinePixelShader",l=`uniform color: vec4f;
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
export{s as Pg};

//# debugId=6F7E11D6918CF37664756E2164756E21
//# sourceMappingURL=site-rvxp85cx.js.map
