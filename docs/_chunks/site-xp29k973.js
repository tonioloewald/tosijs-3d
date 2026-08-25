import{_B as e}from"./site-ea0e8ybd.js";var r="displayPassPixelShader",a=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;var passSamplerSampler: sampler;var passSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(passSampler,passSamplerSampler,input.vUV);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=a;var p={name:r,shader:a};
export{p as ah};

//# debugId=418BD0322DE3897C64756E2164756E21
//# sourceMappingURL=site-xp29k973.js.map
