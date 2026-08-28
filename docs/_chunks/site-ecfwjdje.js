import{bz as p}from"./site-x5qmcm6t.js";import{cz as d}from"./site-awdbhfyx.js";import{dz as c}from"./site-yb6m4nmt.js";import{ez as m}from"./site-3bypgmhg.js";import{nA as a}from"./site-e1dgx5rz.js";import{oA as n}from"./site-0wedehmd.js";import{pA as t,qA as s}from"./site-ep0mpq5r.js";import{rA as i}from"./site-pvgny3b5.js";import{sA as l}from"./site-j4rsshqj.js";import{DD as e}from"./site-53d1aqt6.js";var r="iblVoxelGridVertexShader",x=`attribute vec3 position;varying vec3 vNormalizedPosition;
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
export{_ as si};

//# debugId=8853D73877D03E3064756E2164756E21
//# sourceMappingURL=site-ecfwjdje.js.map
