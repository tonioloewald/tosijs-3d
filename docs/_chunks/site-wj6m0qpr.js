import{oy as x}from"./site-fgscpmqx.js";import{py as p}from"./site-9ybrda99.js";import{qy as l}from"./site-1kxmqk96.js";import{ry as c}from"./site-1va0ehtp.js";import{Mz as v}from"./site-mvfkq6qz.js";import{Qz as u}from"./site-sskzjsez.js";import{Yz as a}from"./site-y7tmjswn.js";import{Zz as i}from"./site-k95xbt0c.js";import{_z as f}from"./site-qpgt37yc.js";import{$z as o}from"./site-vfnvgm24.js";import{aA as s}from"./site-rw0sq824.js";import{bA as d}from"./site-2st9rym3.js";import{eA as m}from"./site-ecygzf33.js";import{fA as n}from"./site-52tvgysg.js";import{DD as e}from"./site-53d1aqt6.js";var r="outlineVertexShader",S=`attribute position: vec3f;attribute normal: vec3f;
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
export{k as Hg};

//# debugId=C6D9854FED5F763564756E2164756E21
//# sourceMappingURL=site-wj6m0qpr.js.map
