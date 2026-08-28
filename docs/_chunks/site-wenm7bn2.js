import{DD as e}from"./site-53d1aqt6.js";var t="lensFlareVertexShader",r=`attribute position: vec2f;uniform viewportMatrix: mat4x4f;varying vUV: vec2f;const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=vertexInputs.position*madd+madd;vertexOutputs.position=uniforms.viewportMatrix* vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var i={name:t,shader:r};
export{i as Uh};

//# debugId=67340937DDCA6E6864756E2164756E21
//# sourceMappingURL=site-wenm7bn2.js.map
