import{DD as e}from"./site-53d1aqt6.js";var r="passPixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var S={name:r,shader:t};
export{S as FA};

//# debugId=3C785BAEFBC3E27464756E2164756E21
//# sourceMappingURL=site-1smnjpwh.js.map
