import{vz as N}from"./site-va0q0csr.js";import{Fz as O}from"./site-f3cv88g4.js";import{Gz as R}from"./site-se4ftdn4.js";import{Mz as T}from"./site-vgb5vnjt.js";import{kA as Q}from"./site-8w3m2z52.js";import{mA as M}from"./site-8j04nt09.js";import{tA as C}from"./site-z4mq96z7.js";import{uA as y}from"./site-yr3y3wm3.js";import{vA as E}from"./site-xpb5srxe.js";import{wA as w}from"./site-96mjvkgz.js";import{xA as I}from"./site-0t2fmc8s.js";import{yA as H}from"./site-4gz1nses.js";import{zA as K}from"./site-5gffc1rv.js";import{AA as B}from"./site-dtr62002.js";import{BA as J}from"./site-q36bydad.js";import{CA as z}from"./site-mkcjsmh9.js";import{_B as j}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var v="shadowOnlyVertexShader",U=`attribute position: vec3f;
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
`;if(!j.ShadersStoreWGSL[v])j.ShadersStoreWGSL[v]=U;var X=[w,y,C,M,z,Q,B,N,O,E,H,I,J,T,K,R];for(let q of X)if(!j.IncludesShadersStoreWGSL[q.name])j.IncludesShadersStoreWGSL[q.name]=q.shader;var x={name:v,shader:U};export{x as shadowOnlyVertexShaderWGSL};

//# debugId=93FA25411B3F29D564756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-n6sw85nr.js.map
