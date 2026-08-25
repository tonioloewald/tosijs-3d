import{_B as r}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="oitFinalSimpleBlendPixelShader",t=`var uFrontColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var fragCoord: vec2i=vec2i(fragmentInputs.position.xy);var frontColor: vec4f=textureLoad(uFrontColor,fragCoord,0);fragmentOutputs.color=frontColor;}
`;if(!r.ShadersStoreWGSL[o])r.ShadersStoreWGSL[o]=t;var n={name:o,shader:t};export{n as oitFinalSimpleBlendPixelShaderWGSL};

//# debugId=8E090EC5D8BB0BD164756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-vr8r0syy.js.map
