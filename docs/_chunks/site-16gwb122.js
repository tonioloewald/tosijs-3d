import{Iz as E}from"./site-3zqr2f8s.js";import{Jz as C}from"./site-40j2q6d0.js";import{Kz as B}from"./site-a3kb4bgm.js";import{Lz as z}from"./site-gjwmfx0p.js";import{tA as q}from"./site-banwg1x5.js";import{uA as p}from"./site-h42r3p91.js";import{vA as v}from"./site-swzkjcsr.js";import{wA as j}from"./site-kvv68a1k.js";import{xA as y}from"./site-nwf3d6yv.js";import{yA as w}from"./site-aezqz187.js";import{_B as f}from"./site-1q3afg48.js";var h="pickingVertexShader",F=`attribute position: vec3f;
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
`;if(!f.ShadersStoreWGSL[h])f.ShadersStoreWGSL[h]=F;var H=[j,p,z,B,q,C,E,v,w,y];for(let g of H)if(!f.IncludesShadersStoreWGSL[g.name])f.IncludesShadersStoreWGSL[g.name]=g.shader;var X={name:h,shader:F};
export{X as qw};

//# debugId=6861246972DAE07664756E2164756E21
//# sourceMappingURL=site-16gwb122.js.map
