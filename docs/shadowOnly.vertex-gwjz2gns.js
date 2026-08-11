import{_j as Y}from"./site-1mc2p6p5.js";import{jy as R}from"./site-zsg33kkw.js";import{Dy as W}from"./site-atd54w7j.js";import{Ey as X}from"./site-wnfkq0sz.js";import{Vy as T}from"./site-2c0n5b0s.js";import{Yy as O}from"./site-ggwxysr4.js";import{Zy as Q}from"./site-vnstybdd.js";import{bz as H}from"./site-1da3yxp4.js";import{cz as J}from"./site-5dczc761.js";import{dz as C,ez as L}from"./site-r50s22pj.js";import{fz as B}from"./site-jmqgc3tb.js";import{gz as K}from"./site-aat7240y.js";import{hz as N}from"./site-vg641y8e.js";import{iz as G}from"./site-ah3v37bk.js";import{jz as M}from"./site-h341dzb9.js";import{kz as E}from"./site-6dmnd63w.js";import{_B as q}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var z="shadowOnlyVertexShader",Z=`precision highp float;attribute vec3 position;
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
`;if(!q.ShadersStore[z])q.ShadersStore[z]=Z;var _=[B,C,H,Y,O,E,Q,G,W,X,J,K,L,M,T,N,R];for(let v of _)if(!q.IncludesShadersStore[v.name])q.IncludesShadersStore[v.name]=v.shader;var D={name:z,shader:Z};export{D as shadowOnlyVertexShader};

//# debugId=5BBFB2837FBB3F8C64756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-gwjz2gns.js.map
