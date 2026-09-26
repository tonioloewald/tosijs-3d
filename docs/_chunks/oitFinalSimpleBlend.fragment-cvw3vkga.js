import{i}from"./site-1yf4ncc8.js";var r="oitFinalSimpleBlendPixelShader",o=`var uFrontColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var fragCoord: vec2i=vec2i(fragmentInputs.position.xy);var frontColor: vec4f=textureLoad(uFrontColor,fragCoord,0);fragmentOutputs.color=frontColor;}
`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;

//# debugId=A9E7312B9168DB5164756E2164756E21
//# sourceMappingURL=oitFinalSimpleBlend.fragment-cvw3vkga.js.map
