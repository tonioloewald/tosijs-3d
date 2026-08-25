import{jy as u}from"./site-7t4jxzrk.js";import{Dy as x}from"./site-xaz59mrc.js";import{Ey as g}from"./site-70kws73r.js";import{Vy as V}from"./site-8200q0kv.js";import{Zy as p}from"./site-kcwst0gf.js";import{az as v}from"./site-jc9mf41q.js";import{bz as d}from"./site-mrme3sf5.js";import{cz as f}from"./site-hkdwmcpe.js";import{dz as t,ez as c}from"./site-1smnc4rx.js";import{fz as r}from"./site-94m3976t.js";import{gz as l}from"./site-fe75yrpf.js";import{hz as s}from"./site-h7bz399p.js";import{iz as a}from"./site-9v0k9401.js";import{jz as m}from"./site-px2b9js0.js";import{kz as n}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="gradientVertexShader",S=`precision highp float;attribute vec3 position;
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
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;varying vec3 vPosition;
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
#ifdef VERTEXCOLOR
vec4 colorUpdated=color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);gl_Position=viewProjection*worldPos;vPositionW=vec3(worldPos);vPosition=position;
#ifdef NORMAL
vNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));
#endif
#ifndef UV1
vec2 uv=vec2(0.,0.);
#endif
#ifndef UV2
vec2 uv2=vec2(0.,0.);
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=S;var h=[r,t,d,n,p,a,x,g,f,l,c,m,V,s,u,v];for(let i of h)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var X={name:o,shader:S};export{X as gradientVertexShader};

//# debugId=8EA0487F5EA61D1764756E2164756E21
//# sourceMappingURL=gradient.vertex-a60pmrc4.js.map
