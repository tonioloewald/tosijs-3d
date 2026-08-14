import{Mz as E}from"./site-gv8wrsgb.js";import{kA as C}from"./site-jzegcmyz.js";import{zA as B}from"./site-fnwnpcr3.js";import{AA as z}from"./site-kt4avh61.js";import{BA as A}from"./site-wb3kettg.js";import{CA as w}from"./site-zm0t5va7.js";import{_B as k}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var v="skyVertexShader",F=`attribute position: vec3f;
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

//# debugId=059AB1B8EE54DDC064756E2164756E21
//# sourceMappingURL=sky.vertex-8z0nm7fa.js.map
