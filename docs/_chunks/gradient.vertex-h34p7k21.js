import{_y as u}from"./site-y56q3gkd.js";import{hz as V}from"./site-tjnqvjpr.js";import{wz as x}from"./site-95fb8q6z.js";import{xz as g}from"./site-7tmgtqgj.js";import{Wz as p}from"./site-p2z3c7py.js";import{oA as v}from"./site-x48q20t3.js";import{pA as d}from"./site-px85h4wa.js";import{qA as f}from"./site-1d4pv99f.js";import{rA as t,sA as c}from"./site-fzx6y8wc.js";import{tA as r}from"./site-fd6t4ht9.js";import{uA as l}from"./site-ner59851.js";import{vA as s}from"./site-bnx70ahp.js";import{wA as a}from"./site-pd495nw5.js";import{xA as m}from"./site-dywf9vzn.js";import{yA as n}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="gradientVertexShader",S=`precision highp float;attribute vec3 position;
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

//# debugId=27724760C252864564756E2164756E21
//# sourceMappingURL=gradient.vertex-h34p7k21.js.map
