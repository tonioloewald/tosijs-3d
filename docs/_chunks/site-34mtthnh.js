import{qy as x}from"./site-xf9cmaz3.js";import{ry as p}from"./site-t1ek064t.js";import{sy as l}from"./site-ggx1n5k2.js";import{ty as c}from"./site-mq9vg3sk.js";import{Oz as v}from"./site-bv1k2m3f.js";import{Sz as u}from"./site-qppa82tt.js";import{_z as a}from"./site-5507dwyb.js";import{$z as i}from"./site-dcm56c99.js";import{aA as f}from"./site-zxt8a8z1.js";import{bA as o}from"./site-0t8qnxs0.js";import{cA as s}from"./site-3734pz33.js";import{dA as d}from"./site-mhy5tdpx.js";import{gA as m}from"./site-01eh560w.js";import{hA as n}from"./site-5222jdjd.js";import{FD as e}from"./site-vrsvvb55.js";var r="outlineVertexShader",S=`attribute position: vec3f;attribute normal: vec3f;
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
export{k as Jg};

//# debugId=EFFB644078EB80D864756E2164756E21
//# sourceMappingURL=site-34mtthnh.js.map
