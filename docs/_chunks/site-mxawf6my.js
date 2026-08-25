import{az as V}from"./site-jc9mf41q.js";import{bz as d}from"./site-mrme3sf5.js";import{cz as c}from"./site-hkdwmcpe.js";import{dz as n,ez as f}from"./site-1smnc4rx.js";import{fz as r}from"./site-94m3976t.js";import{gz as l}from"./site-fe75yrpf.js";import{hz as s}from"./site-h7bz399p.js";import{iz as a}from"./site-9v0k9401.js";import{jz as m}from"./site-px2b9js0.js";import{kz as t}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";var i="colorVertexShader",x=`attribute vec3 position;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform mat4 view;
#endif
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
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
vec4 worldPos=finalWorld*vec4(position,1.0);
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {gl_Position=viewProjection*worldPos;} else {gl_Position=viewProjectionR*worldPos;}
#else
gl_Position=viewProjection*worldPos;
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[i])e.ShadersStore[i]=x;var p=[r,n,t,a,d,c,l,f,m,s,V];for(let o of p)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var g={name:i,shader:x};
export{g as $y};

//# debugId=BE68D25591CDA51B64756E2164756E21
//# sourceMappingURL=site-mxawf6my.js.map
