import{_B as e}from"./site-ea0e8ybd.js";var t="meshUVSpaceRendererMaskerVertexShader",r=`attribute uv: vec2f;varying vUV: vec2f;@vertex
fn main(input : VertexInputs)->FragmentInputs {vertexOutputs.position= vec4f( vec2f(vertexInputs.uv.x,vertexInputs.uv.y)*2.0-1.0,0.,1.0);vertexOutputs.vUV=vertexInputs.uv;}`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=r;var n={name:t,shader:r};
export{n as oh};

//# debugId=1571A91B079B11FC64756E2164756E21
//# sourceMappingURL=site-bpaybacd.js.map
