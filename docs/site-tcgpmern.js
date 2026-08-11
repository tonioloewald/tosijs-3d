import{_B as b}from"./site-7jxv124x.js";var f="lensFlareVertexShader",k=`attribute position: vec2f;uniform viewportMatrix: mat4x4f;varying vUV: vec2f;const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=vertexInputs.position*madd+madd;vertexOutputs.position=uniforms.viewportMatrix* vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var w={name:f,shader:k};
export{w as Oh};

//# debugId=F23820897965159F64756E2164756E21
//# sourceMappingURL=site-tcgpmern.js.map
