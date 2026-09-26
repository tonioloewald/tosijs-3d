import{i}from"./site-1yf4ncc8.js";var e="lodPixelShader",t=`const GammaEncodePowerApprox=1.0/2.2;varying vUV: vec2f;var textureSampler: texture_2d<f32>;uniform lod: f32;uniform gamma: i32;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let textureSize=textureDimensions(textureSampler);fragmentOutputs.color=textureLoad(textureSampler,vec2u(fragmentInputs.vUV*vec2f(textureSize)),u32(uniforms.lod));if (uniforms.gamma==0) {fragmentOutputs.color=vec4f(pow(fragmentOutputs.color.rgb,vec3f(GammaEncodePowerApprox)),fragmentOutputs.color.a);}}
`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=t;var f0={name:e,shader:t};
export{f0};

//# debugId=7755557B37D9898164756E2164756E21
//# sourceMappingURL=site-jpjyc8gh.js.map
