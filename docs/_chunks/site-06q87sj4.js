import{_B as b}from"./site-1q3afg48.js";var f="clearQuadVertexShader",k=`uniform depthValue: f32;const pos=array(
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
`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var w={name:f,shader:k};
export{w as dt};

//# debugId=24E1A800235FBB1064756E2164756E21
//# sourceMappingURL=site-06q87sj4.js.map
