import{_B as e}from"./site-ea0e8ybd.js";var t="glowMapMergeVertexShader",r=`attribute position: vec2f;varying vUV: vec2f;
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=vertexInputs.position*madd+madd;vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var o={name:t,shader:r};
export{o as al};

//# debugId=573211262E5B30EC64756E2164756E21
//# sourceMappingURL=site-4yrdr23d.js.map
