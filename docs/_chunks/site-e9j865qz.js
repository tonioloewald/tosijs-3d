import{_B as e}from"./site-ea0e8ybd.js";var t="hdrFilteringVertexShader",r=`attribute position: vec2f;varying direction: vec3f;uniform up: vec3f;uniform right: vec3f;uniform front: vec3f;
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
var view: mat3x3f= mat3x3f(uniforms.up,uniforms.right,uniforms.front);vertexOutputs.direction=view*vec3f(vertexInputs.position,1.0);vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var n={name:t,shader:r};
export{n as Fh};

//# debugId=35BA9B074E786E1864756E2164756E21
//# sourceMappingURL=site-e9j865qz.js.map
