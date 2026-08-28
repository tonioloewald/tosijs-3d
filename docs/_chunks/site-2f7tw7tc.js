import{oy as p}from"./site-fgscpmqx.js";import{py as l}from"./site-9ybrda99.js";import{qy as c}from"./site-1kxmqk96.js";import{ry as d}from"./site-1va0ehtp.js";import{Yz as n}from"./site-y7tmjswn.js";import{Zz as i}from"./site-k95xbt0c.js";import{_z as a}from"./site-qpgt37yc.js";import{$z as o}from"./site-vfnvgm24.js";import{aA as m}from"./site-rw0sq824.js";import{bA as s}from"./site-2st9rym3.js";import{DD as e}from"./site-53d1aqt6.js";var t="pickingVertexShader",f=`attribute position: vec3f;
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
export{I as Zx};

//# debugId=EB8833EEB99EF07664756E2164756E21
//# sourceMappingURL=site-2f7tw7tc.js.map
