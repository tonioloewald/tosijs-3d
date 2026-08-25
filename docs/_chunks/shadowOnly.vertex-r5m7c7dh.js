import{_j as v}from"./site-0pgrs4f3.js";import{jy as x}from"./site-7t4jxzrk.js";import{Dy as u}from"./site-xaz59mrc.js";import{Ey as S}from"./site-70kws73r.js";import{Vy as h}from"./site-8200q0kv.js";import{Yy as p}from"./site-yygbvmyr.js";import{Zy as V}from"./site-kcwst0gf.js";import{bz as l}from"./site-mrme3sf5.js";import{cz as c}from"./site-hkdwmcpe.js";import{dz as n,ez as f}from"./site-1smnc4rx.js";import{fz as r}from"./site-94m3976t.js";import{gz as d}from"./site-fe75yrpf.js";import{hz as s}from"./site-h7bz399p.js";import{iz as a}from"./site-9v0k9401.js";import{jz as m}from"./site-px2b9js0.js";import{kz as t}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="shadowOnlyVertexShader",D=`precision highp float;attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<__decl__sceneVertex>
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);gl_Position=viewProjection*worldPos;vPositionW=vec3(worldPos);
#ifdef NORMAL
vNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=D;var g=[r,n,l,v,p,t,V,a,u,S,c,d,f,m,h,s,x];for(let i of g)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var z={name:o,shader:D};export{z as shadowOnlyVertexShader};

//# debugId=ACDC2630BC1E3F5064756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-r5m7c7dh.js.map
