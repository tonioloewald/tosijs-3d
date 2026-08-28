import{Yy as u}from"./site-2dsa0ab6.js";import{fz as V}from"./site-bmmnqtf5.js";import{uz as x}from"./site-6jttm5w8.js";import{vz as g}from"./site-z6q3x0pt.js";import{Uz as p}from"./site-zqq9zg2d.js";import{mA as v}from"./site-5hpywt0t.js";import{nA as d}from"./site-e1dgx5rz.js";import{oA as f}from"./site-0wedehmd.js";import{pA as t,qA as c}from"./site-ep0mpq5r.js";import{rA as r}from"./site-pvgny3b5.js";import{sA as l}from"./site-j4rsshqj.js";import{tA as s}from"./site-798xczjz.js";import{uA as a}from"./site-6w2nxcx7.js";import{vA as m}from"./site-ygkkxrec.js";import{wA as n}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="gradientVertexShader",S=`precision highp float;attribute vec3 position;
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

//# debugId=3FC3D06D5523E92864756E2164756E21
//# sourceMappingURL=gradient.vertex-qrm7q0vx.js.map
