import{Pz as n}from"./site-wra029kb.js";import{FD as e}from"./site-vrsvvb55.js";var t="rgbdEncodePixelShader",a=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=toRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb);}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=a;var S=[n];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var s={name:t,shader:a};
export{s as Ft};

//# debugId=124EF83BCD62A98364756E2164756E21
//# sourceMappingURL=site-w5zpbwj2.js.map
