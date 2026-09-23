import{ik as s}from"./site-82m4jewt.js";import{hz as v}from"./site-tjnqvjpr.js";import{Jz as f}from"./site-k72q68wn.js";import{Wz as l}from"./site-p2z3c7py.js";import{pA as n}from"./site-px85h4wa.js";import{qA as c}from"./site-1d4pv99f.js";import{vA as d}from"./site-bnx70ahp.js";import{wA as t}from"./site-pd495nw5.js";import{xA as a}from"./site-dywf9vzn.js";import{yA as r}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="gridVertexShader",p=`precision highp float;attribute vec3 position;attribute vec3 normal;
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
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=p;var m=[n,s,f,l,t,r,c,d,a,v];for(let i of m)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var h={name:o,shader:p};export{h as gridVertexShader};

//# debugId=B38D18450773BCB164756E2164756E21
//# sourceMappingURL=grid.vertex-pnqxmdgc.js.map
