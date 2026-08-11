import{jy as X}from"./site-zsg33kkw.js";import{Dy as Z}from"./site-atd54w7j.js";import{Ey as _}from"./site-wnfkq0sz.js";import{Vy as Y}from"./site-2c0n5b0s.js";import{Zy as W}from"./site-vnstybdd.js";import{az as T}from"./site-6mysyne0.js";import{bz as K}from"./site-1da3yxp4.js";import{cz as L}from"./site-5dczc761.js";import{dz as G,ez as O}from"./site-r50s22pj.js";import{fz as E}from"./site-jmqgc3tb.js";import{gz as N}from"./site-aat7240y.js";import{hz as R}from"./site-vg641y8e.js";import{iz as J}from"./site-ah3v37bk.js";import{jz as Q}from"./site-h341dzb9.js";import{kz as H}from"./site-6dmnd63w.js";import{_B as q}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var B="gradientVertexShader",$=`precision highp float;attribute vec3 position;
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
`;if(!q.ShadersStore[B])q.ShadersStore[B]=$;var w=[E,G,K,H,W,J,Z,_,L,N,O,Q,Y,R,X,T];for(let z of w)if(!q.IncludesShadersStore[z.name])q.IncludesShadersStore[z.name]=z.shader;var D={name:B,shader:$};export{D as gradientVertexShader};

//# debugId=05681C82DD3F103864756E2164756E21
//# sourceMappingURL=gradient.vertex-rr8js59w.js.map
