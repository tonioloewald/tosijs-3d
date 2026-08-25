import{_B as e}from"./site-ea0e8ybd.js";var t="meshUVSpaceRendererFinaliserVertexShader",r=`attribute position: vec3f;attribute uv: vec2f;uniform worldViewProjection: mat4x4f;varying vUV: vec2f;@vertex
fn main(input : VertexInputs)->FragmentInputs {vertexOutputs.position=uniforms.worldViewProjection* vec4f(vertexInputs.position,1.0);vertexOutputs.positionvUV=vertexInputs.uv;}
`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var n={name:t,shader:r};
export{n as qh};

//# debugId=58381194B309E7DC64756E2164756E21
//# sourceMappingURL=site-1q1y0jyh.js.map
