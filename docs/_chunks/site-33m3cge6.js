import{bz as p}from"./site-x5qmcm6t.js";import{cz as c}from"./site-awdbhfyx.js";import{dz as l}from"./site-yb6m4nmt.js";import{ez as m}from"./site-3bypgmhg.js";import{nA as n}from"./site-e1dgx5rz.js";import{oA as a}from"./site-0wedehmd.js";import{pA as i,qA as d}from"./site-ep0mpq5r.js";import{rA as t}from"./site-pvgny3b5.js";import{sA as s}from"./site-j4rsshqj.js";import{DD as e}from"./site-53d1aqt6.js";var o="pickingVertexShader",f=`attribute vec3 position;
#if defined(INSTANCES)
attribute float instanceMeshID;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
uniform mat4 viewProjection;
#if defined(INSTANCES)
flat varying float vMeshID;
#endif
void main(void) {vec3 positionUpdated=position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);gl_Position=viewProjection*worldPos;
#if defined(INSTANCES)
vMeshID=instanceMeshID;
#endif
}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=f;var h=[t,i,m,c,n,l,p,a,s,d];for(let r of h)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var k={name:o,shader:f};
export{k as Dv};

//# debugId=3363CD454336B5A964756E2164756E21
//# sourceMappingURL=site-33m3cge6.js.map
