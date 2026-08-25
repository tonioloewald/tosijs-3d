import{Iz as x}from"./site-y40ej5ba.js";import{Jz as p}from"./site-1w4902w7.js";import{Kz as c}from"./site-n3gh9tjy.js";import{Lz as l}from"./site-381mtspt.js";import{Mz as v}from"./site-sxz4tpxg.js";import{kA as u}from"./site-ngcgfsjk.js";import{tA as a}from"./site-r9g7b3jk.js";import{uA as i}from"./site-6w70dcy8.js";import{vA as f}from"./site-a7gatv2c.js";import{wA as o}from"./site-46ekkv30.js";import{xA as s}from"./site-ks7svjaa.js";import{yA as d}from"./site-2j048m3x.js";import{BA as m}from"./site-35gh5jpy.js";import{CA as n}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";var r="outlineVertexShader",S=`attribute position: vec3f;attribute normal: vec3f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
uniform offset: f32;
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#ifdef ALPHATEST
varying vUV: vec2f;uniform diffuseMatrix: mat4x4f; 
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input: VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;var normalUpdated: vec3f=vertexInputs.normal;
#ifdef UV1
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#ifdef UV2
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
var offsetPosition: vec3f=positionUpdated+(normalUpdated*uniforms.offset);
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld*vec4f(offsetPosition,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uvUpdated,1.0,0.0)).xy;
#endif
#ifdef UV2
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uv2Updated,1.0,0.0)).xy;
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=S;var V=[o,i,l,c,n,a,u,p,x,f,d,s,m,v];for(let t of V)if(!e.IncludesShadersStoreWGSL[t.name])e.IncludesShadersStoreWGSL[t.name]=t.shader;var k={name:r,shader:S};
export{k as Qg};

//# debugId=35420B0D83AE855564756E2164756E21
//# sourceMappingURL=site-qcjk67z0.js.map
