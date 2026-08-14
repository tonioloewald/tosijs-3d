import{_j as J}from"./site-pz8hk1a4.js";import{Vy as H}from"./site-ef54yptm.js";import{Yy as F}from"./site-vsp6hkzp.js";import{Zy as G}from"./site-7fsb8rv3.js";import{bz as A}from"./site-dwr5s1ha.js";import{cz as B}from"./site-z5fa4raw.js";import{hz as E}from"./site-c8b9sfgq.js";import{iz as z}from"./site-xa7p3j10.js";import{jz as C}from"./site-510tzh5c.js";import{kz as w}from"./site-kw5vzqp8.js";import{_B as k}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var v="gridVertexShader",K=`precision highp float;attribute vec3 position;attribute vec3 normal;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#include<instancesDeclaration>
#include<__decl__sceneVertex>
varying vec3 vPosition;varying vec3 vNormal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
varying vec3 vWorldPos;
#endif
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#ifdef OPACITY
varying vec2 vOpacityUV;uniform mat4 opacityMatrix;uniform vec2 vOpacityInfos;
#endif
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
vec4 worldPos=finalWorld*vec4(position,1.0);
#include<fogVertex>
vec4 cameraSpacePosition=view*worldPos;gl_Position=projection*cameraSpacePosition;
#ifdef OPACITY
#ifndef UV1
vec2 uv=vec2(0.,0.);
#endif
#ifndef UV2
vec2 uv2=vec2(0.,0.);
#endif
if (vOpacityInfos.x==0.)
{vOpacityUV=vec2(opacityMatrix*vec4(uv,1.0,0.0));}
else
{vOpacityUV=vec2(opacityMatrix*vec4(uv2,1.0,0.0));}
#endif 
#include<clipPlaneVertex>
#include<logDepthVertex>
vPosition=position;vNormal=normal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
vWorldPos=worldPos.xyz;
#endif
#define CUSTOM_VERTEX_MAIN_END
}`;if(!k.ShadersStore[v])k.ShadersStore[v]=K;var L=[A,J,F,G,z,w,B,E,C,H];for(let q of L)if(!k.IncludesShadersStore[q.name])k.IncludesShadersStore[q.name]=q.shader;var $={name:v,shader:K};export{$ as gridVertexShader};

//# debugId=0A2E7C0ACFF4981564756E2164756E21
//# sourceMappingURL=grid.vertex-q6zmgj8f.js.map
