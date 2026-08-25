import{_B as t}from"./site-ea0e8ybd.js";var e="oitBackBlendPixelShader",r=`var uBackColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureLoad(uBackColor,vec2i(fragmentInputs.position.xy),0);if (fragmentOutputs.color.a==0.0) {discard;}}
`;if(!t.ShadersStoreWGSL[e])t.ShadersStoreWGSL[e]=r;var o={name:e,shader:r};
export{o as Hm};

//# debugId=38EB2A393267B71464756E2164756E21
//# sourceMappingURL=site-ftmmdhwx.js.map
