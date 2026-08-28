import{bz as V}from"./site-x5qmcm6t.js";import{cz as s}from"./site-awdbhfyx.js";import{dz as u}from"./site-yb6m4nmt.js";import{ez as m}from"./site-3bypgmhg.js";import{fz as v}from"./site-bmmnqtf5.js";import{Uz as p}from"./site-zqq9zg2d.js";import{nA as n}from"./site-e1dgx5rz.js";import{oA as d}from"./site-0wedehmd.js";import{pA as i,qA as c}from"./site-ep0mpq5r.js";import{rA as r}from"./site-pvgny3b5.js";import{sA as l}from"./site-j4rsshqj.js";import{vA as f}from"./site-ygkkxrec.js";import{wA as a}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";var o="outlineVertexShader",x=`attribute vec3 position;attribute vec3 normal;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
uniform float offset;
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef ALPHATEST
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;vec3 normalUpdated=normal;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
vec3 offsetPosition=positionUpdated+(normalUpdated*offset);
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(offsetPosition,1.0);gl_Position=viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=x;var h=[r,i,m,s,a,n,p,u,V,d,l,c,f,v];for(let t of h)if(!e.IncludesShadersStore[t.name])e.IncludesShadersStore[t.name]=t.shader;var j={name:o,shader:x};
export{j as Jg};

//# debugId=A82D2F7DD888A31A64756E2164756E21
//# sourceMappingURL=site-9k2db0z9.js.map
