import{_B as e}from"./site-ea0e8ybd.js";var r="lensFlarePixelShader",t=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform color: vec4f;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
var baseColor: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);fragmentOutputs.color=baseColor*uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var S={name:r,shader:t};
export{S as Nh};

//# debugId=D5D92FE9FB70766A64756E2164756E21
//# sourceMappingURL=site-347zt8cj.js.map
