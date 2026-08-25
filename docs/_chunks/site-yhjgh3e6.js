import{Iz as p}from"./site-y40ej5ba.js";import{Jz as l}from"./site-1w4902w7.js";import{Kz as d}from"./site-n3gh9tjy.js";import{Lz as c}from"./site-381mtspt.js";import{tA as n}from"./site-r9g7b3jk.js";import{uA as i}from"./site-6w70dcy8.js";import{vA as a}from"./site-a7gatv2c.js";import{wA as o}from"./site-46ekkv30.js";import{xA as m}from"./site-ks7svjaa.js";import{yA as s}from"./site-2j048m3x.js";import{_B as e}from"./site-ea0e8ybd.js";var t="pickingVertexShader",f=`attribute position: vec3f;
#if defined(INSTANCES)
attribute instanceMeshID: f32;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#if defined(INSTANCES)
flat varying vMeshID: f32;
#endif
@vertex
fn main(input : VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld*vec4f(positionUpdated,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#if defined(INSTANCES)
vertexOutputs.vMeshID=vertexInputs.instanceMeshID;
#endif
}
`;if(!e.ShadersStoreWGSL[t])e.ShadersStoreWGSL[t]=f;var S=[o,i,c,d,n,l,p,a,s,m];for(let r of S)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var I={name:t,shader:f};
export{I as qw};

//# debugId=BB8ED535FF0F75AD64756E2164756E21
//# sourceMappingURL=site-yhjgh3e6.js.map
