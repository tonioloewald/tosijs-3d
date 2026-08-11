import{_B as f}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var k="handleVertexShader",p=`attribute position: vec3f;uniform positionOffset: vec3f;uniform worldViewProjection: mat4x4f;uniform scale: f32;@vertex
fn main(input: VertexInputs)->FragmentInputs {let vPos: vec4f=vec4f((vertexInputs.position+uniforms.positionOffset)*uniforms.scale,1.0);vertexOutputs.position=uniforms.worldViewProjection*vPos;}
`;if(!f.ShadersStoreWGSL[k])f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as handleVertexShaderWGSL};

//# debugId=93062ECD2FCE0A5C64756E2164756E21
//# sourceMappingURL=handle.vertex-8s4s9s3r.js.map
