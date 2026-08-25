import{jy as u}from"./site-7t4jxzrk.js";import{Dy as p}from"./site-xaz59mrc.js";import{Ey as x}from"./site-70kws73r.js";import{Vy as V}from"./site-8200q0kv.js";import{Zy as v}from"./site-kcwst0gf.js";import{bz as a}from"./site-mrme3sf5.js";import{cz as d}from"./site-hkdwmcpe.js";import{dz as r,ez as l}from"./site-1smnc4rx.js";import{fz as n}from"./site-94m3976t.js";import{gz as c}from"./site-fe75yrpf.js";import{hz as s}from"./site-h7bz399p.js";import{iz as f}from"./site-9v0k9401.js";import{jz as m}from"./site-px2b9js0.js";import{kz as t}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="normalVertexShader",D=`precision highp float;attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform mat4 view;uniform mat4 viewProjection;
#ifdef DIFFUSE
varying vec2 vDiffuseUV;uniform mat4 diffuseMatrix;uniform vec2 vDiffuseInfos;
#endif
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
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
#ifndef UV1
vec2 uv=vec2(0.,0.);
#endif
#ifndef UV2
vec2 uv2=vec2(0.,0.);
#endif
#ifdef DIFFUSE
if (vDiffuseInfos.x==0.)
{vDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));}
else
{vDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));}
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
`;if(!e.ShadersStore[o])e.ShadersStore[o]=D;var S=[n,r,a,t,v,f,p,x,d,c,l,m,V,s,u];for(let i of S)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var R={name:o,shader:D};export{R as normalVertexShader};

//# debugId=500CC38C5C462DB864756E2164756E21
//# sourceMappingURL=normal.vertex-4vsz8s7p.js.map
