import{i}from"./site-1yf4ncc8.js";var e="passPixelShader",r=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=r;var p1={name:e,shader:r};
export{p1};

//# debugId=3C82C98C982319EA64756E2164756E21
//# sourceMappingURL=site-9bxyq549.js.map
