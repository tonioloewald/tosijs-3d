import{qe,Ze,We,Fe,Xe,je}from"./site-rq3518tk.js";import{ye,Te}from"./site-zy7gzq4e.js";import{lt,ft}from"./site-1fnr94jv.js";import{gi}from"./site-h0k215g3.js";import{i}from"./site-1yf4ncc8.js";var r="colorVertexShader",o=`attribute position: vec3f;
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform view: mat4x4f;
#endif
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
var colorUpdated: vec4f=vertexInputs.color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var t=[qe,Ze,ye,lt,We,Fe,Xe,je,Te,ft,gi];for(let e of t)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var iA={name:r,shader:o};
export{iA};

//# debugId=1780FF54B9B95E3F64756E2164756E21
//# sourceMappingURL=site-21cpakss.js.map
