import{_B as b}from"./site-7jxv124x.js";var f="meshUVSpaceRendererFinaliserVertexShader",k=`attribute position: vec3f;attribute uv: vec2f;uniform worldViewProjection: mat4x4f;varying vUV: vec2f;@vertex
fn main(input : VertexInputs)->FragmentInputs {vertexOutputs.position=uniforms.worldViewProjection* vec4f(vertexInputs.position,1.0);vertexOutputs.positionvUV=vertexInputs.uv;}
`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var w={name:f,shader:k};
export{w as qh};

//# debugId=847551F5212E2AE564756E2164756E21
//# sourceMappingURL=site-gk8twwtf.js.map
