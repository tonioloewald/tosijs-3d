import{eA as v}from"./site-j8zqjr4g.js";import{fA as w}from"./site-tdvypywv.js";import{jA as q}from"./site-9xy7s866.js";import{_B as b}from"./site-7jxv124x.js";var k="imageProcessingPixelShader",x=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
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

//# debugId=F2C4942B0DE6776B64756E2164756E21
//# sourceMappingURL=site-6fxmm14a.js.map
