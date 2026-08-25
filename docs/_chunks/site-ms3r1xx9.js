import{_B as e}from"./site-ea0e8ybd.js";var t="highlightsPixelShader",r=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;const RGBLuminanceCoefficients: vec3f= vec3f(0.2126,0.7152,0.0722);
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var tex: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);var c: vec3f=tex.rgb;var luma: f32=dot(c.rgb,RGBLuminanceCoefficients);fragmentOutputs.color= vec4f(pow(c, vec3f(25.0-luma*15.0)),tex.a); }`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var n={name:t,shader:r};
export{n as ch};

//# debugId=8639BAE4E8ADBF6564756E2164756E21
//# sourceMappingURL=site-ms3r1xx9.js.map
