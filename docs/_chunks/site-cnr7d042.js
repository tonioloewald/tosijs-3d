import{_B as b}from"./site-1q3afg48.js";var k="lodPixelShader",q=`const GammaEncodePowerApprox=1.0/2.2;varying vUV: vec2f;var textureSampler: texture_2d<f32>;uniform lod: f32;uniform gamma: i32;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let textureSize=textureDimensions(textureSampler);fragmentOutputs.color=textureLoad(textureSampler,vec2u(fragmentInputs.vUV*vec2f(textureSize)),u32(uniforms.lod));if (uniforms.gamma==0) {fragmentOutputs.color=vec4f(pow(fragmentOutputs.color.rgb,vec3f(GammaEncodePowerApprox)),fragmentOutputs.color.a);}}
`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=q;var w={name:k,shader:q};
export{w as qA};

//# debugId=FEA85155CB18749C64756E2164756E21
//# sourceMappingURL=site-cnr7d042.js.map
