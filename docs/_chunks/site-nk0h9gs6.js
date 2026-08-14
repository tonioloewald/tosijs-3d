import{_B as b}from"./site-1q3afg48.js";var f="meshUVSpaceRendererMaskerVertexShader",l=`attribute uv: vec2f;varying vUV: vec2f;@vertex
fn main(input : VertexInputs)->FragmentInputs {vertexOutputs.position= vec4f( vec2f(vertexInputs.uv.x,vertexInputs.uv.y)*2.0-1.0,0.,1.0);vertexOutputs.vUV=vertexInputs.uv;}`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=l;var w={name:f,shader:l};
export{w as oh};

//# debugId=5DF1F9CE73B3AAF264756E2164756E21
//# sourceMappingURL=site-nk0h9gs6.js.map
