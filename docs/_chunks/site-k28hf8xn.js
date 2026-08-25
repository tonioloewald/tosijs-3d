import{jA as n}from"./site-t4ayqvvy.js";import{_B as e}from"./site-ea0e8ybd.js";var t="rgbdEncodePixelShader",a=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=toRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb);}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=a;var S=[n];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var s={name:t,shader:a};
export{s as Uu};

//# debugId=E945BFFDC0BFAA0664756E2164756E21
//# sourceMappingURL=site-k28hf8xn.js.map
