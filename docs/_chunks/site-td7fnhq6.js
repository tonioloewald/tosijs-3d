import{_B as e}from"./site-ea0e8ybd.js";var r="passPixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var S={name:r,shader:t};
export{S as XB};

//# debugId=B6D79F1FCB9C06B564756E2164756E21
//# sourceMappingURL=site-td7fnhq6.js.map
