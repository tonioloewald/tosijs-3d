import{Iz as f}from"./site-y40ej5ba.js";import{Jz as c}from"./site-1w4902w7.js";import{Kz as s}from"./site-n3gh9tjy.js";import{Lz as d}from"./site-381mtspt.js";import{tA as n}from"./site-r9g7b3jk.js";import{uA as a}from"./site-6w70dcy8.js";import{vA as i}from"./site-a7gatv2c.js";import{wA as t}from"./site-46ekkv30.js";import{xA as l}from"./site-ks7svjaa.js";import{yA as m}from"./site-2j048m3x.js";import{_B as e}from"./site-ea0e8ybd.js";var o="meshUVSpaceRendererVertexShader",S=`attribute position: vec3f;attribute normal: vec3f;attribute uv: vec2f;uniform projMatrix: mat4x4f;varying vDecalTC: vec2f;
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
export{N as mh};

//# debugId=0E00CD7592C851D564756E2164756E21
//# sourceMappingURL=site-r6yjtf4f.js.map
