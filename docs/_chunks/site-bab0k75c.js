import{i}from"./site-1yf4ncc8.js";var e="proceduralVertexShader",t=`attribute position: vec2f;varying vPosition: vec2f;varying vUV: vec2f;const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vPosition=vertexInputs.position;vertexOutputs.vUV=vertexInputs.position*madd+madd;vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStoreWGSL[e])i.ShadersStoreWGSL[e]=t;var _C={name:e,shader:t};
export{_C};

//# debugId=18BA49887D85BA0464756E2164756E21
//# sourceMappingURL=site-bab0k75c.js.map
