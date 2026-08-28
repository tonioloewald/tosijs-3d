import{DD as r}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="oitFinalSimpleBlendPixelShader",t=`var uFrontColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var fragCoord: vec2i=vec2i(fragmentInputs.position.xy);var frontColor: vec4f=textureLoad(uFrontColor,fragCoord,0);fragmentOutputs.color=frontColor;}
`;if(!r.ShadersStoreWGSL[o])r.ShadersStoreWGSL[o]=t;var n={name:o,shader:t};export{n as oitFinalSimpleBlendPixelShaderWGSL};

//# debugId=5DC42CA2110BA5C564756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-pbqmsth6.js.map
