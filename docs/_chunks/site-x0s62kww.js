import{Zz as S}from"./site-cd3v83k9.js";import{_z as c}from"./site-5507dwyb.js";import{$z as t}from"./site-dcm56c99.js";import{aA as f}from"./site-zxt8a8z1.js";import{bA as i}from"./site-0t8qnxs0.js";import{cA as l}from"./site-3734pz33.js";import{dA as d}from"./site-mhy5tdpx.js";import{eA as s}from"./site-tqjmspfh.js";import{fA as a}from"./site-zz9ayhhh.js";import{gA as m}from"./site-01eh560w.js";import{hA as n}from"./site-5222jdjd.js";import{FD as e}from"./site-vrsvvb55.js";var o="colorVertexShader",x=`attribute position: vec3f;
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
}`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=x;var p=[i,t,n,a,c,f,d,l,m,s,S];for(let r of p)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var b={name:o,shader:x};
export{b as Yz};

//# debugId=4255BBA69DA2B32A64756E2164756E21
//# sourceMappingURL=site-x0s62kww.js.map
