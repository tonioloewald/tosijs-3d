import{Qe,qe,ze,Fe,Xe,$e}from"./site-4s554m3w.js";import{be,Se}from"./site-v5nrt80s.js";import{ct,ft}from"./site-ndfh7s22.js";import{_i}from"./site-erkvnygb.js";import{i}from"./site-1yf4ncc8.js";var r="colorVertexShader",o=`attribute position: vec3f;
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
}`;if(!i.ShadersStoreWGSL[r])i.ShadersStoreWGSL[r]=o;var t=[Qe,qe,be,ct,ze,Fe,Xe,$e,Se,ft,_i];for(let e of t)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var HC={name:r,shader:o};
export{HC};

//# debugId=219120A50F300DEE64756E2164756E21
//# sourceMappingURL=site-mx0xatwp.js.map
