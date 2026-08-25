import{Mz as c}from"./site-sxz4tpxg.js";import{kA as a}from"./site-ngcgfsjk.js";import{zA as f}from"./site-yej5cjxm.js";import{AA as i}from"./site-ar3nhn4n.js";import{BA as n}from"./site-35gh5jpy.js";import{CA as t}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="skyVertexShader",l=`attribute position: vec3f;
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
uniform world: mat4x4f;uniform view: mat4x4f;uniform viewProjection: mat4x4f;
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<logDepthDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.position=uniforms.viewProjection*uniforms.world* vec4f(vertexInputs.position,1.0);var worldPos: vec4f=uniforms.world* vec4f(vertexInputs.position,1.0);vertexOutputs.vPositionW= worldPos.xyz;
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#ifdef VERTEXCOLOR
vertexOutputs.vColor=vertexInputs.color;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=l;var s=[a,t,i,n,c,f];for(let o of s)if(!e.IncludesShadersStoreWGSL[o.name])e.IncludesShadersStoreWGSL[o.name]=o.shader;var V={name:r,shader:l};export{V as skyVertexShaderWGSL};

//# debugId=509FC46A0668D7DE64756E2164756E21
//# sourceMappingURL=sky.vertex-8jgm20hn.js.map
