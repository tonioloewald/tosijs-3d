import{_B as b}from"./site-1q3afg48.js";var f="hdrFilteringVertexShader",k=`attribute position: vec2f;varying direction: vec3f;uniform up: vec3f;uniform right: vec3f;uniform front: vec3f;
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
var view: mat3x3f= mat3x3f(uniforms.up,uniforms.right,uniforms.front);vertexOutputs.direction=view*vec3f(vertexInputs.position,1.0);vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var w={name:f,shader:k};
export{w as Fh};

//# debugId=C590A49E5E15680A64756E2164756E21
//# sourceMappingURL=site-wfdy0hea.js.map
