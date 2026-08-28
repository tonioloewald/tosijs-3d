import{Nz as n}from"./site-apq8y78s.js";import{DD as e}from"./site-53d1aqt6.js";var t="rgbdEncodePixelShader",a=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=toRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb);}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=a;var S=[n];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var s={name:t,shader:a};
export{s as Dt};

//# debugId=CF7806CEBEB3CEE964756E2164756E21
//# sourceMappingURL=site-qgr87veq.js.map
