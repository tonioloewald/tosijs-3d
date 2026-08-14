import{jA as k}from"./site-0asqx2x4.js";import{_B as b}from"./site-1q3afg48.js";var g="rgbdDecodePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!b.ShadersStoreWGSL[g])b.ShadersStoreWGSL[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var y={name:g,shader:q};
export{y as Ru};

//# debugId=882EEAED2F64E75064756E2164756E21
//# sourceMappingURL=site-rn5qmm2z.js.map
