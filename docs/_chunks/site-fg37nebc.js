import{ky as l}from"./site-669y2q89.js";import{ly as m}from"./site-vxe7fynz.js";import{my as p}from"./site-2qqvh5ah.js";import{ny as c}from"./site-7qs7fydd.js";import{bz as n}from"./site-mrme3sf5.js";import{cz as a}from"./site-hkdwmcpe.js";import{dz as i,ez as d}from"./site-1smnc4rx.js";import{fz as t}from"./site-94m3976t.js";import{gz as s}from"./site-fe75yrpf.js";import{_B as e}from"./site-ea0e8ybd.js";var o="pickingVertexShader",f=`attribute vec3 position;
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
export{k as sw};

//# debugId=C87950E418ED155F64756E2164756E21
//# sourceMappingURL=site-fg37nebc.js.map
