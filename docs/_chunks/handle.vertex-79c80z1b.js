import{_B as f}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var k="handleVertexShader",p=`attribute position: vec3f;uniform positionOffset: vec3f;uniform worldViewProjection: mat4x4f;uniform scale: f32;@vertex
fn main(input: VertexInputs)->FragmentInputs {let vPos: vec4f=vec4f((vertexInputs.position+uniforms.positionOffset)*uniforms.scale,1.0);vertexOutputs.position=uniforms.worldViewProjection*vPos;}
`;if(!f.ShadersStoreWGSL[k])f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as handleVertexShaderWGSL};

//# debugId=DADD1C20CB7A84E964756E2164756E21
//# sourceMappingURL=handle.vertex-79c80z1b.js.map
