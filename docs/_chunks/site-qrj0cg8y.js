import{_B as e}from"./site-ea0e8ybd.js";var r="hdrIrradianceFilteringVertexShader",t=`attribute position: vec2f;varying direction: vec3f;uniform up: vec3f;uniform right: vec3f;uniform front: vec3f;
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
var view: mat3x3f= mat3x3f(uniforms.up,uniforms.right,uniforms.front);vertexOutputs.direction=view*vec3f(vertexInputs.position,1.0);vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var n={name:r,shader:t};
export{n as Jh};

//# debugId=101478AEF2AA524E64756E2164756E21
//# sourceMappingURL=site-qrj0cg8y.js.map
