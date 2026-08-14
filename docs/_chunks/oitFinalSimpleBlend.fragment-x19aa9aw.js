import{_B as b}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var k="oitFinalSimpleBlendPixelShader",q=`var uFrontColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var fragCoord: vec2i=vec2i(fragmentInputs.position.xy);var frontColor: vec4f=textureLoad(uFrontColor,fragCoord,0);fragmentOutputs.color=frontColor;}
`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=q;var w={name:k,shader:q};export{w as oitFinalSimpleBlendPixelShaderWGSL};

//# debugId=B2E7275897AE9E4264756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-x19aa9aw.js.map
