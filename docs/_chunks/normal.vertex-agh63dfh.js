import{_y as u}from"./site-y56q3gkd.js";import{hz as V}from"./site-tjnqvjpr.js";import{wz as p}from"./site-95fb8q6z.js";import{xz as x}from"./site-7tmgtqgj.js";import{Wz as v}from"./site-p2z3c7py.js";import{pA as a}from"./site-px85h4wa.js";import{qA as d}from"./site-1d4pv99f.js";import{rA as r,sA as l}from"./site-fzx6y8wc.js";import{tA as n}from"./site-fd6t4ht9.js";import{uA as c}from"./site-ner59851.js";import{vA as s}from"./site-bnx70ahp.js";import{wA as f}from"./site-pd495nw5.js";import{xA as m}from"./site-dywf9vzn.js";import{yA as t}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="normalVertexShader",D=`precision highp float;attribute vec3 position;
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
`;if(!e.ShadersStore[o])e.ShadersStore[o]=D;var S=[n,r,a,t,v,f,p,x,d,c,l,m,V,s,u];for(let i of S)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var R={name:o,shader:D};export{R as normalVertexShader};

//# debugId=0C69A96C1081B99164756E2164756E21
//# sourceMappingURL=normal.vertex-agh63dfh.js.map
