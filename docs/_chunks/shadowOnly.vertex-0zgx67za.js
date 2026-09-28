import{Qe,qe,Ue,Be,Xe,$e}from"./site-e5y3w894.js";import{Ct}from"./site-czf9pgne.js";import{be,Se}from"./site-v5nrt80s.js";import{X}from"./site-vka3s0eg.js";import{lt,ft}from"./site-1fnr94jv.js";import{$i}from"./site-tm6rcrap.js";import{ei,ti}from"./site-ege7yt1s.js";import{st}from"./site-gbqy22ka.js";import{i}from"./site-1yf4ncc8.js";var t="shadowOnlyVertexShader",r=`attribute position: vec3f;
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
`;if(!i.ShadersStoreWGSL[t])i.ShadersStoreWGSL[t]=r;var o=[Qe,qe,Ue,Ct,be,X,lt,$i,ei,Be,Xe,$e,Se,st,ft,ti];for(let e of o)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var h={name:t,shader:r};export{h as shadowOnlyVertexShaderWGSL};

//# debugId=42D2F92ED02DBBCB64756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-0zgx67za.js.map
