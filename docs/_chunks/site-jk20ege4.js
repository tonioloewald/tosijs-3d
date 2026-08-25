import{ky as c}from"./site-669y2q89.js";import{ly as m}from"./site-vxe7fynz.js";import{my as p}from"./site-2qqvh5ah.js";import{ny as d}from"./site-7qs7fydd.js";import{bz as a}from"./site-mrme3sf5.js";import{cz as n}from"./site-hkdwmcpe.js";import{dz as t,ez as s}from"./site-1smnc4rx.js";import{fz as i}from"./site-94m3976t.js";import{gz as l}from"./site-fe75yrpf.js";import{_B as e}from"./site-ea0e8ybd.js";var r="iblVoxelGridVertexShader",x=`attribute vec3 position;varying vec3 vNormalizedPosition;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
uniform mat4 invWorldScale;uniform mat4 viewMatrix;void main(void) {vec3 positionUpdated=position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);gl_Position=viewMatrix*invWorldScale*worldPos;vNormalizedPosition.xyz=gl_Position.xyz*0.5+0.5;
#ifdef IS_NDC_HALF_ZRANGE
gl_Position.z=gl_Position.z*0.5+0.5;
#endif
}`;if(!e.ShadersStore[r])e.ShadersStore[r]=x;var f=[i,t,a,m,d,c,p,n,l,s];for(let o of f)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var _={name:r,shader:x};
export{_ as mi};

//# debugId=3C2CD72B6ECAF70864756E2164756E21
//# sourceMappingURL=site-jk20ege4.js.map
