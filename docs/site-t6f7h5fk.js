import{_B as b}from"./site-7jxv124x.js";var f="glowMapMergeVertexShader",k=`attribute position: vec2f;varying vUV: vec2f;
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {const madd: vec2f= vec2f(0.5,0.5);
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=vertexInputs.position*madd+madd;vertexOutputs.position= vec4f(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var y={name:f,shader:k};
export{y as al};

//# debugId=F2C9287925501EF364756E2164756E21
//# sourceMappingURL=site-t6f7h5fk.js.map
