import{Y}from"./site-7zyg1thv.js";import{Se,ye}from"./site-0dc500ez.js";import{at,dt}from"./site-kgcr3xya.js";import{it}from"./site-dh95za6w.js";import{i}from"./site-1yf4ncc8.js";var o="skyVertexShader",r=`attribute position: vec3f;
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
`;if(!i.ShadersStoreWGSL[o])i.ShadersStoreWGSL[o]=r;var t=[Y,Se,at,ye,it,dt];for(let e of t)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var p={name:o,shader:r};export{p as skyVertexShaderWGSL};

//# debugId=95E347733592417464756E2164756E21
//# sourceMappingURL=sky.vertex-ndc72xfx.js.map
