import{Pz as a}from"./site-wra029kb.js";import{FD as e}from"./site-vrsvvb55.js";var t="rgbdDecodePixelShader",n=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=n;var S=[a];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var s={name:t,shader:n};
export{s as Vx};

//# debugId=0C238EEE4EF8323A64756E2164756E21
//# sourceMappingURL=site-paey4694.js.map
