import{Mz as E}from"./site-vgb5vnjt.js";import{kA as C}from"./site-8w3m2z52.js";import{zA as B}from"./site-5gffc1rv.js";import{AA as z}from"./site-dtr62002.js";import{BA as A}from"./site-q36bydad.js";import{CA as w}from"./site-mkcjsmh9.js";import{_B as k}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var v="skyVertexShader",F=`attribute position: vec3f;
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
`;if(!k.ShadersStoreWGSL[v])k.ShadersStoreWGSL[v]=F;var H=[C,w,z,A,E,B];for(let q of H)if(!k.IncludesShadersStoreWGSL[q.name])k.IncludesShadersStoreWGSL[q.name]=q.shader;var T={name:v,shader:F};export{T as skyVertexShaderWGSL};

//# debugId=76C9A07FCF63115864756E2164756E21
//# sourceMappingURL=sky.vertex-p7mrza61.js.map
