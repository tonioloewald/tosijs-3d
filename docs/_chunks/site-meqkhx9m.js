import{i}from"./site-1yf4ncc8.js";var e="postprocessVertexShader",t=`attribute position: vec2<f32>;uniform scale: vec2<f32>;varying vUV: vec2<f32>;const madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=(vertexInputs.position*madd+madd)*uniforms.scale;vertexOutputs.position=vec4(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=t;var hE={name:e,shader:t};
export{hE};

//# debugId=59EB4AB7C4A4167164756E2164756E21
//# sourceMappingURL=site-meqkhx9m.js.map
