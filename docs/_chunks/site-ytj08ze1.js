import{DD as e}from"./site-53d1aqt6.js";var r="anaglyphPixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;var leftSamplerSampler: sampler;var leftSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var leftFrag: vec4f=textureSample(leftSampler,leftSamplerSampler,input.vUV);leftFrag= vec4f(1.0,leftFrag.g,leftFrag.b,1.0);var rightFrag: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);rightFrag= vec4f(rightFrag.r,1.0,1.0,1.0);fragmentOutputs.color= vec4f(rightFrag.rgb*leftFrag.rgb,1.0);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var l={name:r,shader:t};
export{l as CA};

//# debugId=23C4DF058A9B9B8264756E2164756E21
//# sourceMappingURL=site-ytj08ze1.js.map
