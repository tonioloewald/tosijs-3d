import{DD as t}from"./site-53d1aqt6.js";var e="oitBackBlendPixelShader",r=`var uBackColor: texture_2d<f32>;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureLoad(uBackColor,vec2i(fragmentInputs.position.xy),0);if (fragmentOutputs.color.a==0.0) {discard;}}
`;if(!t.ShadersStoreWGSL[e])t.ShadersStoreWGSL[e]=r;var o={name:e,shader:r};
export{o as Nm};

//# debugId=6A349FDCAAC4EC5F64756E2164756E21
//# sourceMappingURL=site-ntjt7zpg.js.map
