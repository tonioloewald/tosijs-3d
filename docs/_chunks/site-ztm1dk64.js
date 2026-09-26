import{re}from"./site-k4eckz4x.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdDecodePixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=t;var a=[re];for(let e of a)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var vC={name:r,shader:t};
export{vC};

//# debugId=54881921E348376C64756E2164756E21
//# sourceMappingURL=site-ztm1dk64.js.map
