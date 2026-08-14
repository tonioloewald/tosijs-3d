import{_B as b}from"./site-1q3afg48.js";var q="oitBackBlendPixelShader",v=`var uBackColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureLoad(uBackColor,vec2i(fragmentInputs.position.xy),0);if (fragmentOutputs.color.a==0.0) {discard;}}
`;if(!b.ShadersStoreWGSL[q])b.ShadersStoreWGSL[q]=v;var x={name:q,shader:v};
export{x as Hm};

//# debugId=88DE9426EE775D4964756E2164756E21
//# sourceMappingURL=site-nja7knnt.js.map
