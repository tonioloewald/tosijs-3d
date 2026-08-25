import{_B as e}from"./site-ea0e8ybd.js";var t="proceduralVertexShader",r=`attribute position: vec2f;varying vPosition: vec2f;varying vUV: vec2f;const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vPosition=vertexInputs.position;vertexOutputs.vUV=vertexInputs.position*madd+madd;vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var o={name:t,shader:r};
export{o as Hi};

//# debugId=896A95196556C77864756E2164756E21
//# sourceMappingURL=site-wm88sg5z.js.map
