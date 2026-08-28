import{Nz as o}from"./site-apq8y78s.js";import{DD as e}from"./site-53d1aqt6.js";var t="extractHighlightsPixelShader",a=`#include<helperFunctions>
varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform threshold: f32;uniform exposure: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);var luma: f32=dot(LuminanceEncodeApprox,fragmentOutputs.color.rgb*uniforms.exposure);fragmentOutputs.color=vec4f(step(uniforms.threshold,luma)*fragmentOutputs.color.rgb,fragmentOutputs.color.a);}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=a;var n=[o];for(let r of n)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var m={name:t,shader:a};
export{m as Rk};

//# debugId=5DAD5EEA6400115064756E2164756E21
//# sourceMappingURL=site-kkss9nhc.js.map
