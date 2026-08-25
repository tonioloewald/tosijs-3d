import{_B as e}from"./site-ea0e8ybd.js";var r="clearQuadVertexShader",t=`uniform depthValue: f32;const pos=array(
vec2f(-1.0,1.0),
vec2f(1.0,1.0),
vec2f(-1.0,-1.0),
vec2f(1.0,-1.0)
);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.position=vec4f(pos[vertexInputs.vertexIndex],uniforms.depthValue,1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var a={name:r,shader:t};
export{a as dt};

//# debugId=DF98001428AA4F4564756E2164756E21
//# sourceMappingURL=site-bwkht79q.js.map
