import{Iz as E}from"./site-r7h9bfm1.js";import{Jz as C}from"./site-mah0pq04.js";import{Kz as B}from"./site-02s7ygmh.js";import{Lz as z}from"./site-98mq7x76.js";import{tA as q}from"./site-z4mq96z7.js";import{uA as p}from"./site-yr3y3wm3.js";import{vA as v}from"./site-xpb5srxe.js";import{wA as j}from"./site-96mjvkgz.js";import{xA as y}from"./site-0t2fmc8s.js";import{yA as w}from"./site-4gz1nses.js";import{_B as f}from"./site-7jxv124x.js";var h="pickingVertexShader",F=`attribute position: vec3f;
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

//# debugId=094B8AB0A940351764756E2164756E21
//# sourceMappingURL=site-ve4mkwye.js.map
