import{oy as f}from"./site-fgscpmqx.js";import{py as c}from"./site-9ybrda99.js";import{qy as d}from"./site-1kxmqk96.js";import{ry as s}from"./site-1va0ehtp.js";import{Yz as n}from"./site-y7tmjswn.js";import{Zz as a}from"./site-k95xbt0c.js";import{_z as i}from"./site-qpgt37yc.js";import{$z as t}from"./site-vfnvgm24.js";import{aA as l}from"./site-rw0sq824.js";import{bA as m}from"./site-2st9rym3.js";import{DD as e}from"./site-53d1aqt6.js";var o="meshUVSpaceRendererVertexShader",S=`attribute position: vec3f;attribute normal: vec3f;attribute uv: vec2f;uniform projMatrix: mat4x4f;varying vDecalTC: vec2f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
@vertex
fn main(input : VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;var normalUpdated: vec3f=vertexInputs.normal;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(positionUpdated,1.0);var normWorldSM: mat3x3f= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz);var vNormalW: vec3f;
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vNormalW=normalUpdated/ vec3f(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
vNormalW=normalize(normWorldSM*normalUpdated);
#endif
var normalView: vec3f=normalize((uniforms.projMatrix* vec4f(vNormalW,0.0)).xyz);var decalTC: vec3f=(uniforms.projMatrix*worldPos).xyz;vertexOutputs.vDecalTC=decalTC.xy;vertexOutputs.position=vec4f(vertexInputs.uv*2.0-1.0,select(decalTC.z,2.,normalView.z>0.0),1.0);}`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=S;var p=[t,a,d,s,n,c,f,i,m,l];for(let r of p)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var N={name:o,shader:S};
export{N as sh};

//# debugId=CBC8B11563EA90D064756E2164756E21
//# sourceMappingURL=site-ej14txff.js.map
