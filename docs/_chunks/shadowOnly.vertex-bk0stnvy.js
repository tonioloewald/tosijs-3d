import{vz as p}from"./site-j4gsdbhf.js";import{Fz as x}from"./site-28xht8fz.js";import{Gz as L}from"./site-skhnnwaq.js";import{Mz as V}from"./site-sxz4tpxg.js";import{kA as u}from"./site-ngcgfsjk.js";import{mA as S}from"./site-1nn7frmg.js";import{tA as l}from"./site-r9g7b3jk.js";import{uA as o}from"./site-6w70dcy8.js";import{vA as c}from"./site-a7gatv2c.js";import{wA as r}from"./site-46ekkv30.js";import{xA as d}from"./site-ks7svjaa.js";import{yA as f}from"./site-2j048m3x.js";import{zA as s}from"./site-yej5cjxm.js";import{AA as a}from"./site-ar3nhn4n.js";import{BA as m}from"./site-35gh5jpy.js";import{CA as n}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="shadowOnlyVertexShader",W=`attribute position: vec3f;
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

//# debugId=60A9C7B913B9DFF164756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-bk0stnvy.js.map
