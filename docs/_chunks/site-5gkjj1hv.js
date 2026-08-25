import{_B as e}from"./site-ea0e8ybd.js";var r="blackAndWhitePixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform degree: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb;var luminance: f32=dot(color, vec3f(0.3,0.59,0.11)); 
var blackAndWhite: vec3f= vec3f(luminance,luminance,luminance);fragmentOutputs.color= vec4f(color-((color-blackAndWhite)*uniforms.degree),1.0);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var n={name:r,shader:t};
export{n as Vk};

//# debugId=6573ABD32F88900464756E2164756E21
//# sourceMappingURL=site-5gkjj1hv.js.map
