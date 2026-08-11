import{jy as Q}from"./site-zsg33kkw.js";import{Dy as T}from"./site-atd54w7j.js";import{Ey as W}from"./site-wnfkq0sz.js";import{Vy as R}from"./site-2c0n5b0s.js";import{Zy as O}from"./site-vnstybdd.js";import{bz as H}from"./site-1da3yxp4.js";import{cz as J}from"./site-5dczc761.js";import{dz as C,ez as L}from"./site-r50s22pj.js";import{fz as B}from"./site-jmqgc3tb.js";import{gz as K}from"./site-aat7240y.js";import{hz as N}from"./site-vg641y8e.js";import{iz as G}from"./site-ah3v37bk.js";import{jz as M}from"./site-h341dzb9.js";import{kz as E}from"./site-6dmnd63w.js";import{_B as q}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var z="normalVertexShader",X=`precision highp float;attribute vec3 position;
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
`;if(!q.ShadersStore[z])q.ShadersStore[z]=X;var Y=[B,C,H,E,O,G,T,W,J,K,L,M,R,N,Q];for(let v of Y)if(!q.IncludesShadersStore[v.name])q.IncludesShadersStore[v.name]=v.shader;var b={name:z,shader:X};export{b as normalVertexShader};

//# debugId=C2CC02E4157B97A164756E2164756E21
//# sourceMappingURL=normal.vertex-5550ym2z.js.map
