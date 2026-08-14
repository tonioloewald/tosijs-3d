import{_B as b}from"./site-1q3afg48.js";var f="glowMapMergeVertexShader",k=`attribute position: vec2f;varying vUV: vec2f;
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=vertexInputs.position*madd+madd;vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var y={name:f,shader:k};
export{y as al};

//# debugId=43509236059ABC2064756E2164756E21
//# sourceMappingURL=site-8bad95zg.js.map
