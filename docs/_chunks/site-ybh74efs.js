import{DD as e}from"./site-53d1aqt6.js";var r="blackAndWhitePixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform degree: f32;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb;var luminance: f32=dot(color, vec3f(0.3,0.59,0.11)); 
var blackAndWhite: vec3f= vec3f(luminance,luminance,luminance);fragmentOutputs.color= vec4f(color-((color-blackAndWhite)*uniforms.degree),1.0);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var n={name:r,shader:t};
export{n as Yk};

//# debugId=71DD67D5F7A05D7C64756E2164756E21
//# sourceMappingURL=site-ybh74efs.js.map
