import{qy as p}from"./site-xf9cmaz3.js";import{ry as l}from"./site-t1ek064t.js";import{sy as c}from"./site-ggx1n5k2.js";import{ty as d}from"./site-mq9vg3sk.js";import{_z as n}from"./site-5507dwyb.js";import{$z as i}from"./site-dcm56c99.js";import{aA as a}from"./site-zxt8a8z1.js";import{bA as o}from"./site-0t8qnxs0.js";import{cA as m}from"./site-3734pz33.js";import{dA as s}from"./site-mhy5tdpx.js";import{FD as e}from"./site-vrsvvb55.js";var t="pickingVertexShader",f=`attribute position: vec3f;
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
export{I as $x};

//# debugId=7A53A0087F9698A964756E2164756E21
//# sourceMappingURL=site-ysqms60e.js.map
