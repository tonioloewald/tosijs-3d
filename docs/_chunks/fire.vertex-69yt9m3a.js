import{Mz as p}from"./site-sxz4tpxg.js";import{kA as m}from"./site-ngcgfsjk.js";import{sA as l}from"./site-y7h65xf9.js";import{tA as a}from"./site-r9g7b3jk.js";import{uA as o}from"./site-6w70dcy8.js";import{vA as s}from"./site-a7gatv2c.js";import{wA as i}from"./site-46ekkv30.js";import{xA as d}from"./site-ks7svjaa.js";import{yA as v}from"./site-2j048m3x.js";import{zA as c}from"./site-yej5cjxm.js";import{AA as f}from"./site-ar3nhn4n.js";import{BA as u}from"./site-35gh5jpy.js";import{CA as n}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="fireVertexShader",x=`attribute position: vec3f;
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform view: mat4x4f;uniform viewProjection: mat4x4f;
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;
#endif
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
uniform time: f32;uniform speed: f32;
#ifdef DIFFUSE
varying vDistortionCoords1: vec2f;varying vDistortionCoords2: vec2f;varying vDistortionCoords3: vec2f;
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
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;
#ifdef DIFFUSE
vertexOutputs.vDiffuseUV=vec2f(vertexInputs.uv.x,vertexInputs.uv.y-0.2);
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<vertexColorMixing>
#ifdef DIFFUSE
var layerSpeed: vec3f= vec3f(-0.2,-0.52,-0.1)*uniforms.speed;vertexOutputs.vDistortionCoords1=vec2f(vertexInputs.uv.x,vertexInputs.uv.y+layerSpeed.x*uniforms.time/1000.0);vertexOutputs.vDistortionCoords2=vec2f(vertexInputs.uv.x,vertexInputs.uv.y+layerSpeed.y*uniforms.time/1000.0);vertexOutputs.vDistortionCoords3=vec2f(vertexInputs.uv.x,vertexInputs.uv.y+layerSpeed.z*uniforms.time/1000.0);
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=x;var S=[i,o,a,n,m,f,s,v,d,u,p,c,l];for(let t of S)if(!e.IncludesShadersStoreWGSL[t.name])e.IncludesShadersStoreWGSL[t.name]=t.shader;var U={name:r,shader:x};export{U as fireVertexShaderWGSL};

//# debugId=E37A8306E4082DA664756E2164756E21
//# sourceMappingURL=fire.vertex-69yt9m3a.js.map
