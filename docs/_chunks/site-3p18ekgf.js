import{Zx as h}from"./site-hf89sktj.js";import{ky as v}from"./site-669y2q89.js";import{ly as u}from"./site-vxe7fynz.js";import{my as x}from"./site-2qqvh5ah.js";import{ny as V}from"./site-7qs7fydd.js";import{bz as f}from"./site-mrme3sf5.js";import{cz as c}from"./site-hkdwmcpe.js";import{dz as d,ez as m}from"./site-1smnc4rx.js";import{fz as a}from"./site-94m3976t.js";import{gz as s}from"./site-fe75yrpf.js";import{jz as p}from"./site-px2b9js0.js";import{kz as l}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";var t="pointCloudVertexDeclaration",o=`#ifdef POINTSIZE
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
export{G as cj};

//# debugId=DEA695F4CE76CE9664756E2164756E21
//# sourceMappingURL=site-3p18ekgf.js.map
