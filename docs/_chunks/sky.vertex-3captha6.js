import{Mz as c}from"./site-mvfkq6qz.js";import{Qz as a}from"./site-sskzjsez.js";import{cA as f}from"./site-5ewpa529.js";import{dA as i}from"./site-47xw6rhq.js";import{eA as n}from"./site-ecygzf33.js";import{fA as t}from"./site-52tvgysg.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var r="skyVertexShader",l=`attribute position: vec3f;
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

//# debugId=7F99B957EC300FCA64756E2164756E21
//# sourceMappingURL=sky.vertex-3captha6.js.map
