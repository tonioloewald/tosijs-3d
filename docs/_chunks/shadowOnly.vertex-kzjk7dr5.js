import{_j as Y}from"./site-pz8hk1a4.js";import{jy as R}from"./site-tdr54sxk.js";import{Dy as W}from"./site-rs9dnmcg.js";import{Ey as X}from"./site-6x55xt9x.js";import{Vy as T}from"./site-ef54yptm.js";import{Yy as O}from"./site-vsp6hkzp.js";import{Zy as Q}from"./site-7fsb8rv3.js";import{bz as H}from"./site-dwr5s1ha.js";import{cz as J}from"./site-z5fa4raw.js";import{dz as C,ez as L}from"./site-zx8qtfzw.js";import{fz as B}from"./site-f2k7n4ns.js";import{gz as K}from"./site-2e30jbpw.js";import{hz as N}from"./site-c8b9sfgq.js";import{iz as G}from"./site-xa7p3j10.js";import{jz as M}from"./site-510tzh5c.js";import{kz as E}from"./site-kw5vzqp8.js";import{_B as q}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var z="shadowOnlyVertexShader",Z=`precision highp float;attribute vec3 position;
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

//# debugId=9E3617DD2326D04E64756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-kzjk7dr5.js.map
