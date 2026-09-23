import{Mz as o}from"./site-16yw12h5.js";import{Sz as i}from"./site-qppa82tt.js";import{lA as t}from"./site-3rcgnqcg.js";import{mA as a}from"./site-jjyxr8ne.js";import{FD as e}from"./site-vrsvvb55.js";var n="outlinePixelShader",l=`uniform color: vec4f;
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
export{s as Ig};

//# debugId=237274CF0A3D3F6F64756E2164756E21
//# sourceMappingURL=site-7zadssze.js.map
