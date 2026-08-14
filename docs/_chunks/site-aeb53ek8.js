import{_B as b}from"./site-1q3afg48.js";var k="passPixelShader",l=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as XB};

//# debugId=FE6616BC19C8E6A564756E2164756E21
//# sourceMappingURL=site-aeb53ek8.js.map
