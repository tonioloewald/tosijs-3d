import{_B as k}from"./site-1q3afg48.js";var l="ssaoCombinePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;var originalColorSampler: sampler;var originalColor: texture_2d<f32>;uniform viewport: vec4f;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
var uv: vec2f=uniforms.viewport.xy+input.vUV*uniforms.viewport.zw;var ssaoColor: vec4f=textureSample(textureSampler,textureSamplerSampler,uv);var sceneColor: vec4f=textureSample(originalColor,originalColorSampler,uv);fragmentOutputs.color=sceneColor*ssaoColor;
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!k.ShadersStoreWGSL[l])k.ShadersStoreWGSL[l]=q;var w={name:l,shader:q};
export{w as pk};

//# debugId=6F64F7BD9D036F8164756E2164756E21
//# sourceMappingURL=site-gmae7zw2.js.map
