import{te}from"./site-ybnjbk1z.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdDecodePixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=t;var a=[te];for(let e of a)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var qT={name:r,shader:t};
export{qT};

//# debugId=5F9095720A5B1B0664756E2164756E21
//# sourceMappingURL=site-y1054ay9.js.map
