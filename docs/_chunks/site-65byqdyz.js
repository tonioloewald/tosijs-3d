import{jA as o}from"./site-t4ayqvvy.js";import{_B as e}from"./site-ea0e8ybd.js";var t="extractHighlightsPixelShader",a=`#include<helperFunctions>
varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform threshold: f32;uniform exposure: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);var luma: f32=dot(LuminanceEncodeApprox,fragmentOutputs.color.rgb*uniforms.exposure);fragmentOutputs.color=vec4f(step(uniforms.threshold,luma)*fragmentOutputs.color.rgb,fragmentOutputs.color.a);}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=a;var n=[o];for(let r of n)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var m={name:t,shader:a};
export{m as Zk};

//# debugId=CC0072E4910B113D64756E2164756E21
//# sourceMappingURL=site-65byqdyz.js.map
