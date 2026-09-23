import{dy as p}from"./site-s6yq1afk.js";import{ny as L}from"./site-53xk42cj.js";import{oy as x}from"./site-5w3ef7b1.js";import{Oz as V}from"./site-bv1k2m3f.js";import{Rz as S}from"./site-93bva1mf.js";import{Sz as u}from"./site-qppa82tt.js";import{_z as l}from"./site-5507dwyb.js";import{$z as o}from"./site-dcm56c99.js";import{aA as c}from"./site-zxt8a8z1.js";import{bA as r}from"./site-0t8qnxs0.js";import{cA as d}from"./site-3734pz33.js";import{dA as f}from"./site-mhy5tdpx.js";import{eA as s}from"./site-tqjmspfh.js";import{fA as a}from"./site-zz9ayhhh.js";import{gA as m}from"./site-01eh560w.js";import{hA as n}from"./site-5222jdjd.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var i="shadowOnlyVertexShader",W=`attribute position: vec3f;
#ifdef NORMAL
attribute normal: vec3f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<sceneUboDeclaration>
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=scene.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;
#ifdef NORMAL
vertexOutputs.vNormalW=normalize(( finalWorld* vec4f(vertexInputs.normal,0.0)).xyz);
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[i])e.ShadersStoreWGSL[i]=W;var v=[r,o,l,S,n,u,a,p,x,c,f,d,m,V,s,L];for(let t of v)if(!e.IncludesShadersStoreWGSL[t.name])e.IncludesShadersStoreWGSL[t.name]=t.shader;var R={name:i,shader:W};export{R as shadowOnlyVertexShaderWGSL};

//# debugId=D8B9CC684C32630F64756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-7q6345hp.js.map
