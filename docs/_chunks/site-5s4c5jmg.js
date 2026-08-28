import{az as h}from"./site-z4f140cp.js";import{bz as x}from"./site-x5qmcm6t.js";import{cz as V}from"./site-awdbhfyx.js";import{dz as v}from"./site-yb6m4nmt.js";import{ez as u}from"./site-3bypgmhg.js";import{nA as f}from"./site-e1dgx5rz.js";import{oA as c}from"./site-0wedehmd.js";import{pA as d,qA as m}from"./site-ep0mpq5r.js";import{rA as a}from"./site-pvgny3b5.js";import{sA as s}from"./site-j4rsshqj.js";import{vA as p}from"./site-ygkkxrec.js";import{wA as l}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";var t="pointCloudVertexDeclaration",o=`#ifdef POINTSIZE
uniform float pointSize;
#endif
`;if(!e.IncludesShadersStore[t])e.IncludesShadersStore[t]=o;var n={name:t,shader:o};var r="depthVertexShader",S=`attribute vec3 position;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
#include<instancesDeclaration>
uniform mat4 viewProjection;uniform vec2 depthValues;
#if defined(ALPHATEST) || defined(NEED_UV)
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#ifdef STORE_CAMERASPACE_Z
uniform mat4 view;varying vec4 vViewPos;
#endif
#include<pointCloudVertexDeclaration>
varying float vDepthMetric;
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#include<clipPlaneVertex>
gl_Position=viewProjection*worldPos;
#ifdef STORE_CAMERASPACE_Z
vViewPos=view*worldPos;
#else
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetric=((-gl_Position.z+depthValues.x)/(depthValues.y));
#else
vDepthMetric=((gl_Position.z+depthValues.x)/(depthValues.y));
#endif
#endif
#if defined(ALPHATEST) || defined(BASIC_RENDER)
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<pointCloudVertex>
}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=S;var D=[a,d,u,V,l,f,n,v,x,c,s,m,p,h];for(let i of D)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var G={name:r,shader:S};
export{G as Lj};

//# debugId=5E85CBAEC739F07A64756E2164756E21
//# sourceMappingURL=site-5s4c5jmg.js.map
