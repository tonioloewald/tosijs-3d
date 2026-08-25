import{eA as n}from"./site-55fjnmm4.js";import{fA as a}from"./site-s8a42t29.js";import{jA as s}from"./site-t4ayqvvy.js";import{_B as e}from"./site-ea0e8ybd.js";var t="imageProcessingPixelShader",i=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<imageProcessingDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var result: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);result=vec4f(max(result.rgb,vec3f(0.)),result.a);
#ifdef IMAGEPROCESSING
#ifndef FROMLINEARSPACE
result=vec4f(toLinearSpaceVec3(result.rgb),result.a);
#endif
result=applyImageProcessing(result);
#else
#ifdef FROMLINEARSPACE
result=applyImageProcessing(result);
#endif
#endif
fragmentOutputs.color=result;}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=i;var o=[n,s,a];for(let r of o)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var m={name:t,shader:i};
export{m as zk};

//# debugId=C29C529CEA62ED0A64756E2164756E21
//# sourceMappingURL=site-hpq69hqe.js.map
