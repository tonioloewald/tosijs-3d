import{i}from"./site-1yf4ncc8.js";var e="lodPixelShader",t=`const GammaEncodePowerApprox=1.0/2.2;varying vUV: vec2f;var textureSampler: texture_2d<f32>;uniform lod: f32;uniform gamma: i32;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let textureSize=textureDimensions(textureSampler);fragmentOutputs.color=textureLoad(textureSampler,vec2u(fragmentInputs.vUV*vec2f(textureSize)),u32(uniforms.lod));if (uniforms.gamma==0) {fragmentOutputs.color=vec4f(pow(fragmentOutputs.color.rgb,vec3f(GammaEncodePowerApprox)),fragmentOutputs.color.a);}}
`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=t;var FC={name:e,shader:t};
export{FC};

//# debugId=D9C6647068F4E43764756E2164756E21
//# sourceMappingURL=site-cj28nsh5.js.map
