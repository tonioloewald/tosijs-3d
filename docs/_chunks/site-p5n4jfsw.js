import{DD as r}from"./site-53d1aqt6.js";var e="bloomMergePixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;var bloomBlurSampler: sampler;var bloomBlur: texture_2d<f32>;uniform bloomWeight: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);var blurred: vec3f=textureSample(bloomBlur,bloomBlurSampler,input.vUV).rgb;fragmentOutputs.color=vec4f(fragmentOutputs.color.rgb+(blurred.rgb*uniforms.bloomWeight),fragmentOutputs.color.a);}
`;if(!r.ShadersStoreWGSL[e])r.ShadersStoreWGSL[e]=t;var a={name:e,shader:t};
export{a as _k};

//# debugId=CE86C289B312990764756E2164756E21
//# sourceMappingURL=site-p5n4jfsw.js.map
