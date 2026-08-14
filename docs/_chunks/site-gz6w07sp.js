import{Iz as I}from"./site-3zqr2f8s.js";import{Jz as H}from"./site-40j2q6d0.js";import{Kz as F}from"./site-a3kb4bgm.js";import{Lz as E}from"./site-gjwmfx0p.js";import{tA as w}from"./site-banwg1x5.js";import{uA as q}from"./site-h42r3p91.js";import{vA as y}from"./site-swzkjcsr.js";import{wA as j}from"./site-kvv68a1k.js";import{xA as B}from"./site-nwf3d6yv.js";import{yA as z}from"./site-aezqz187.js";import{BA as C}from"./site-wb3kettg.js";import{CA as v}from"./site-zm0t5va7.js";import{_B as f}from"./site-1q3afg48.js";var h="depthVertexShader",J=`attribute position: vec3f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;uniform depthValues: vec2f;
#if defined(ALPHATEST) || defined(NEED_UV)
varying vUV: vec2f;uniform diffuseMatrix: mat4x4f;
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#endif
#ifdef STORE_CAMERASPACE_Z
uniform view: mat4x4f;varying vViewPos: vec4f;
#endif
varying vDepthMetric: f32;
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;
#ifdef UV1
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#ifdef UV2
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(positionUpdated,1.0);
#include<clipPlaneVertex>
vertexOutputs.position=uniforms.viewProjection*worldPos;
#ifdef STORE_CAMERASPACE_Z
vertexOutputs.vViewPos=uniforms.view*worldPos;
#else
#ifdef USE_REVERSE_DEPTHBUFFER
vertexOutputs.vDepthMetric=((-vertexOutputs.position.z+uniforms.depthValues.x)/(uniforms.depthValues.y));
#else
vertexOutputs.vDepthMetric=((vertexOutputs.position.z+uniforms.depthValues.x)/(uniforms.depthValues.y));
#endif
#endif
#if defined(ALPHATEST) || defined(BASIC_RENDER)
#ifdef UV1
vertexOutputs.vUV= (uniforms.diffuseMatrix* vec4f(uvUpdated,1.0,0.0)).xy;
#endif
#ifdef UV2
vertexOutputs.vUV= (uniforms.diffuseMatrix* vec4f(uv2Updated,1.0,0.0)).xy;
#endif
#endif
}
`;if(!f.ShadersStoreWGSL[h])f.ShadersStoreWGSL[h]=J;var K=[j,q,E,F,v,w,H,I,y,z,B,C];for(let g of K)if(!f.IncludesShadersStoreWGSL[g.name])f.IncludesShadersStoreWGSL[g.name]=g.shader;var u={name:h,shader:J};
export{u as Xj};

//# debugId=A4F8FC931D5E4CB364756E2164756E21
//# sourceMappingURL=site-gz6w07sp.js.map
