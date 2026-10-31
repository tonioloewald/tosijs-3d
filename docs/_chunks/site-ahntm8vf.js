import{qe,Ze,Ue,Be,Ye,$e}from"./site-sbq0q7cv.js";import{Se,ye}from"./site-0dc500ez.js";import{lt,ft}from"./site-1fnr94jv.js";import{gi}from"./site-h0k215g3.js";import{i}from"./site-1yf4ncc8.js";var r="colorVertexShader",o=`attribute position: vec3f;
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
}`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var t=[qe,Ze,Se,lt,Ue,Be,Ye,$e,ye,ft,gi];for(let e of t)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var tA={name:r,shader:o};
export{tA};

//# debugId=D8ECCBDDA0B81F6864756E2164756E21
//# sourceMappingURL=site-ahntm8vf.js.map
