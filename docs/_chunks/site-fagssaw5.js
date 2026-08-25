import{_B as e}from"./site-ea0e8ybd.js";var t="fluidRenderingParticleThicknessVertexShader",r=`attribute position: vec3f;attribute offset: vec2f;uniform view: mat4x4f;uniform projection: mat4x4f;uniform size: vec2f;varying uv: vec2f;@vertex
fn main(input: VertexInputs)->FragmentInputs {var cornerPos: vec3f=vec3f(
vec2f(vertexInputs.offset.x-0.5,vertexInputs.offset.y-0.5)*uniforms.size,
0.0
);var viewPos: vec3f=(uniforms.view*vec4f(vertexInputs.position,1.0)).xyz+cornerPos;vertexOutputs.position=uniforms.projection*vec4f(viewPos,1.0);vertexOutputs.uv=vertexInputs.offset;}
`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var o={name:t,shader:r};
export{o as Jg};

//# debugId=6AA303E217CC671664756E2164756E21
//# sourceMappingURL=site-fagssaw5.js.map
