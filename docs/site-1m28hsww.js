import{sA as N}from"./site-qzx2edtk.js";import{tA as E}from"./site-z4mq96z7.js";import{uA as y}from"./site-yr3y3wm3.js";import{vA as F}from"./site-xpb5srxe.js";import{wA as w}from"./site-96mjvkgz.js";import{xA as I}from"./site-0t2fmc8s.js";import{yA as H}from"./site-4gz1nses.js";import{zA as K}from"./site-5gffc1rv.js";import{AA as B}from"./site-dtr62002.js";import{BA as J}from"./site-q36bydad.js";import{CA as z}from"./site-mkcjsmh9.js";import{_B as h}from"./site-7jxv124x.js";var q="colorVertexShader",O=`attribute position: vec3f;
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
}`;if(!h.ShadersStoreWGSL[q])h.ShadersStoreWGSL[q]=O;var Q=[w,y,z,B,E,F,H,I,J,K,N];for(let j of Q)if(!h.IncludesShadersStoreWGSL[j.name])h.IncludesShadersStoreWGSL[j.name]=j.shader;var C={name:q,shader:O};
export{C as rA};

//# debugId=9164CDBD5565A92F64756E2164756E21
//# sourceMappingURL=site-1m28hsww.js.map
