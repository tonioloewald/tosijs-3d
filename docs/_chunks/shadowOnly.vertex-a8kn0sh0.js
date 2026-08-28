import{by as p}from"./site-e2ybmp7j.js";import{ly as L}from"./site-5fd1kg31.js";import{my as x}from"./site-t1apa46f.js";import{Mz as V}from"./site-mvfkq6qz.js";import{Pz as S}from"./site-5mpt0yyf.js";import{Qz as u}from"./site-sskzjsez.js";import{Yz as l}from"./site-y7tmjswn.js";import{Zz as o}from"./site-k95xbt0c.js";import{_z as c}from"./site-qpgt37yc.js";import{$z as r}from"./site-vfnvgm24.js";import{aA as d}from"./site-rw0sq824.js";import{bA as f}from"./site-2st9rym3.js";import{cA as s}from"./site-5ewpa529.js";import{dA as a}from"./site-47xw6rhq.js";import{eA as m}from"./site-ecygzf33.js";import{fA as n}from"./site-52tvgysg.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var i="shadowOnlyVertexShader",W=`attribute position: vec3f;
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

//# debugId=EAF7ED84DD96ED4564756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-a8kn0sh0.js.map
