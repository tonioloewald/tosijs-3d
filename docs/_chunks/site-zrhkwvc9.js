import{_B as e}from"./site-ea0e8ybd.js";var r="filterPixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform kernelMatrix: mat4x4f;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var baseColor: vec3f=textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb;var updatedColor: vec3f=(uniforms.kernelMatrix* vec4f(baseColor,1.0)).rgb;fragmentOutputs.color= vec4f(updatedColor,1.0);}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var o={name:r,shader:t};
export{o as Hk};

//# debugId=C2959408E5CDCA2B64756E2164756E21
//# sourceMappingURL=site-zrhkwvc9.js.map
