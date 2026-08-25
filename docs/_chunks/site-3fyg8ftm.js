import{sA as S}from"./site-y7h65xf9.js";import{tA as c}from"./site-r9g7b3jk.js";import{uA as t}from"./site-6w70dcy8.js";import{vA as f}from"./site-a7gatv2c.js";import{wA as i}from"./site-46ekkv30.js";import{xA as l}from"./site-ks7svjaa.js";import{yA as d}from"./site-2j048m3x.js";import{zA as s}from"./site-yej5cjxm.js";import{AA as a}from"./site-ar3nhn4n.js";import{BA as m}from"./site-35gh5jpy.js";import{CA as n}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";var o="colorVertexShader",x=`attribute position: vec3f;
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
export{b as rA};

//# debugId=F7BFB5A68C3DD96D64756E2164756E21
//# sourceMappingURL=site-3fyg8ftm.js.map
