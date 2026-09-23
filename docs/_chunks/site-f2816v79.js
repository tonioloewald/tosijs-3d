import{FD as t}from"./site-vrsvvb55.js";var e="oitBackBlendPixelShader",r=`var uBackColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureLoad(uBackColor,vec2i(fragmentInputs.position.xy),0);if (fragmentOutputs.color.a==0.0) {discard;}}
`;if(!t.ShadersStoreWGSL[e])t.ShadersStoreWGSL[e]=r;var o={name:e,shader:r};
export{o as Pm};

//# debugId=4199D3DB1DDD4E2B64756E2164756E21
//# sourceMappingURL=site-f2816v79.js.map
