import{jy as X}from"./site-tdr54sxk.js";import{Dy as Z}from"./site-rs9dnmcg.js";import{Ey as _}from"./site-6x55xt9x.js";import{Vy as Y}from"./site-ef54yptm.js";import{Zy as W}from"./site-7fsb8rv3.js";import{az as T}from"./site-bxq8qnzk.js";import{bz as K}from"./site-dwr5s1ha.js";import{cz as L}from"./site-z5fa4raw.js";import{dz as G,ez as O}from"./site-zx8qtfzw.js";import{fz as E}from"./site-f2k7n4ns.js";import{gz as N}from"./site-2e30jbpw.js";import{hz as R}from"./site-c8b9sfgq.js";import{iz as J}from"./site-xa7p3j10.js";import{jz as Q}from"./site-510tzh5c.js";import{kz as H}from"./site-kw5vzqp8.js";import{_B as q}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var B="cellVertexShader",$=`precision highp float;attribute vec3 position;
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
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!q.ShadersStore[B])q.ShadersStore[B]=$;var v=[E,G,K,H,W,J,Z,_,L,N,O,Q,R,X,T,Y];for(let z of v)if(!q.IncludesShadersStore[z.name])q.IncludesShadersStore[z.name]=z.shader;var S={name:B,shader:$};export{S as cellVertexShader};

//# debugId=6A69D059232F83D864756E2164756E21
//# sourceMappingURL=cell.vertex-w0j66ahj.js.map
