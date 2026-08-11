import{Iz as E}from"./site-r7h9bfm1.js";import{Jz as C}from"./site-mah0pq04.js";import{Kz as B}from"./site-02s7ygmh.js";import{Lz as z}from"./site-98mq7x76.js";import{tA as q}from"./site-z4mq96z7.js";import{uA as p}from"./site-yr3y3wm3.js";import{vA as v}from"./site-xpb5srxe.js";import{wA as j}from"./site-96mjvkgz.js";import{xA as y}from"./site-0t2fmc8s.js";import{yA as w}from"./site-4gz1nses.js";import{_B as f}from"./site-7jxv124x.js";var h="meshUVSpaceRendererVertexShader",F=`attribute position: vec3f;attribute normal: vec3f;attribute uv: vec2f;uniform projMatrix: mat4x4f;varying vDecalTC: vec2f;
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
var normalView: vec3f=normalize((uniforms.projMatrix* vec4f(vNormalW,0.0)).xyz);var decalTC: vec3f=(uniforms.projMatrix*worldPos).xyz;vertexOutputs.vDecalTC=decalTC.xy;vertexOutputs.position=vec4f(vertexInputs.uv*2.0-1.0,select(decalTC.z,2.,normalView.z>0.0),1.0);}`;if(!f.ShadersStoreWGSL[h])f.ShadersStoreWGSL[h]=F;var H=[j,p,z,B,q,C,E,v,w,y];for(let g of H)if(!f.IncludesShadersStoreWGSL[g.name])f.IncludesShadersStoreWGSL[g.name]=g.shader;var X={name:h,shader:F};
export{X as mh};

//# debugId=0F104438D48B528564756E2164756E21
//# sourceMappingURL=site-ads68w8z.js.map
