import{_B as b}from"./site-7jxv124x.js";var k="copyTexture3DLayerToTexturePixelShader",l=`var textureSampler: texture_3d<f32>;uniform layerNum: i32;varying vUV: vec2f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let coord=vec3f(vec2f(input.vUV.x,input.vUV.y)*vec2f(textureDimensions(textureSampler,0).xy),f32(uniforms.layerNum));let color=textureLoad(textureSampler,vec3i(coord),0).rgb;fragmentOutputs.color= vec4f(color,1);}`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=l;var v={name:k,shader:l};
export{v as ti};

//# debugId=BFEFCC6D4EFF257164756E2164756E21
//# sourceMappingURL=site-8dkjns56.js.map
