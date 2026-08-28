import{Nz as a}from"./site-apq8y78s.js";import{DD as e}from"./site-53d1aqt6.js";var t="rgbdDecodePixelShader",n=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=n;var S=[a];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var s={name:t,shader:n};
export{s as Tx};

//# debugId=F0F4C8C6233E6C4564756E2164756E21
//# sourceMappingURL=site-6erhkt2e.js.map
