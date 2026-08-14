import{_B as b}from"./site-1q3afg48.js";var k="anaglyphPixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;var leftSamplerSampler: sampler;var leftSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var leftFrag: vec4f=textureSample(leftSampler,leftSamplerSampler,input.vUV);leftFrag= vec4f(1.0,leftFrag.g,leftFrag.b,1.0);var rightFrag: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);rightFrag= vec4f(rightFrag.r,1.0,1.0,1.0);fragmentOutputs.color= vec4f(rightFrag.rgb*leftFrag.rgb,1.0);}`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=q;var w={name:k,shader:q};
export{w as qz};

//# debugId=DFA78408042140FF64756E2164756E21
//# sourceMappingURL=site-ha1fs9wy.js.map
