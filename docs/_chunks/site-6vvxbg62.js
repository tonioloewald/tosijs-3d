import{eA as v}from"./site-k3tc6dn5.js";import{fA as w}from"./site-f96ys6rt.js";import{jA as q}from"./site-0asqx2x4.js";import{_B as b}from"./site-1q3afg48.js";var k="imageProcessingPixelShader",x=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
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
fragmentOutputs.color=result;}`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=x;var y=[v,q,w];for(let f of y)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var E={name:k,shader:x};
export{E as zk};

//# debugId=CF6251CB036AE84964756E2164756E21
//# sourceMappingURL=site-6vvxbg62.js.map
