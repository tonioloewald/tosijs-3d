import{_B as b}from"./site-7jxv124x.js";var f="meshUVSpaceRendererMaskerVertexShader",l=`attribute uv: vec2f;varying vUV: vec2f;@vertex
fn main(input : VertexInputs)->FragmentInputs {vertexOutputs.position= vec4f( vec2f(vertexInputs.uv.x,vertexInputs.uv.y)*2.0-1.0,0.,1.0);vertexOutputs.vUV=vertexInputs.uv;}`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=l;var w={name:f,shader:l};
export{w as oh};

//# debugId=A3936C254B2BC78264756E2164756E21
//# sourceMappingURL=site-esarn671.js.map
