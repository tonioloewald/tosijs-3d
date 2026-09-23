import{FD as r}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="oitFinalSimpleBlendPixelShader",t=`var uFrontColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var fragCoord: vec2i=vec2i(fragmentInputs.position.xy);var frontColor: vec4f=textureLoad(uFrontColor,fragCoord,0);fragmentOutputs.color=frontColor;}
`;if(!r.ShadersStoreWGSL[o])r.ShadersStoreWGSL[o]=t;var n={name:o,shader:t};export{n as oitFinalSimpleBlendPixelShaderWGSL};

//# debugId=B81B0D08564F85A564756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-rmgn3gya.js.map
