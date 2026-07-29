import{_B as b}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var k="oitFinalSimpleBlendPixelShader",q=`var uFrontColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var fragCoord: vec2i=vec2i(fragmentInputs.position.xy);var frontColor: vec4f=textureLoad(uFrontColor,fragCoord,0);fragmentOutputs.color=frontColor;}
`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=q;var w={name:k,shader:q};export{w as oitFinalSimpleBlendPixelShaderWGSL};

//# debugId=77D4D21ED421501064756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-qzdhqt93.js.map
