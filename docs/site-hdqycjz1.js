import{_B as b}from"./site-7jxv124x.js";var q="oitBackBlendPixelShader",v=`var uBackColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureLoad(uBackColor,vec2i(fragmentInputs.position.xy),0);if (fragmentOutputs.color.a==0.0) {discard;}}
`;if(!b.ShadersStoreWGSL[q])b.ShadersStoreWGSL[q]=v;var x={name:q,shader:v};
export{x as Hm};

//# debugId=ACFD90125505DDDE64756E2164756E21
//# sourceMappingURL=site-hdqycjz1.js.map
