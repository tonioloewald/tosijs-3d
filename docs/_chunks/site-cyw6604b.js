import{DD as e}from"./site-53d1aqt6.js";var r="displayPassPixelShader",a=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;var passSamplerSampler: sampler;var passSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(passSampler,passSamplerSampler,input.vUV);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=a;var p={name:r,shader:a};
export{p as gh};

//# debugId=837FC3691E6DF55664756E2164756E21
//# sourceMappingURL=site-cyw6604b.js.map
