import{Xz as S}from"./site-3xtsc73f.js";import{Yz as c}from"./site-y7tmjswn.js";import{Zz as t}from"./site-k95xbt0c.js";import{_z as f}from"./site-qpgt37yc.js";import{$z as i}from"./site-vfnvgm24.js";import{aA as l}from"./site-rw0sq824.js";import{bA as d}from"./site-2st9rym3.js";import{cA as s}from"./site-5ewpa529.js";import{dA as a}from"./site-47xw6rhq.js";import{eA as m}from"./site-ecygzf33.js";import{fA as n}from"./site-52tvgysg.js";import{DD as e}from"./site-53d1aqt6.js";var o="colorVertexShader",x=`attribute position: vec3f;
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
export{b as Wz};

//# debugId=508A0BD40FDA183464756E2164756E21
//# sourceMappingURL=site-6qqhsq9y.js.map
