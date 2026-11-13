import{i}from"./site-1yf4ncc8.js";var e="postprocessVertexShader",t=`attribute position: vec2<f32>;uniform scale: vec2<f32>;varying vUV: vec2<f32>;const madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=(vertexInputs.position*madd+madd)*uniforms.scale;vertexOutputs.position=vec4(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=t;var d1={name:e,shader:t};
export{d1};

//# debugId=FC1E720ABEE0E0BC64756E2164756E21
//# sourceMappingURL=site-6pwwy1p8.js.map
