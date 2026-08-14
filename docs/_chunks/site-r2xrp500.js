import{_B as b}from"./site-1q3afg48.js";var f="postprocessVertexShader",k=`attribute position: vec2<f32>;uniform scale: vec2<f32>;varying vUV: vec2<f32>;const madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=(vertexInputs.position*madd+madd)*uniforms.scale;vertexOutputs.position=vec4(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var q={name:f,shader:k};
export{q as IA};

//# debugId=9B1B7A775CED81FC64756E2164756E21
//# sourceMappingURL=site-r2xrp500.js.map
