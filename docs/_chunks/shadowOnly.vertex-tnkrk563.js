import{ik as v}from"./site-82m4jewt.js";import{_y as x}from"./site-y56q3gkd.js";import{hz as h}from"./site-tjnqvjpr.js";import{wz as u}from"./site-95fb8q6z.js";import{xz as S}from"./site-7tmgtqgj.js";import{Jz as p}from"./site-k72q68wn.js";import{Wz as V}from"./site-p2z3c7py.js";import{pA as l}from"./site-px85h4wa.js";import{qA as c}from"./site-1d4pv99f.js";import{rA as n,sA as f}from"./site-fzx6y8wc.js";import{tA as r}from"./site-fd6t4ht9.js";import{uA as d}from"./site-ner59851.js";import{vA as s}from"./site-bnx70ahp.js";import{wA as a}from"./site-pd495nw5.js";import{xA as m}from"./site-dywf9vzn.js";import{yA as t}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="shadowOnlyVertexShader",D=`precision highp float;attribute vec3 position;
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
`;if(!e.ShadersStore[o])e.ShadersStore[o]=D;var g=[r,n,l,v,p,t,V,a,u,S,c,d,f,m,h,s,x];for(let i of g)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var z={name:o,shader:D};export{z as shadowOnlyVertexShader};

//# debugId=88FA554BD5A9571E64756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-tnkrk563.js.map
