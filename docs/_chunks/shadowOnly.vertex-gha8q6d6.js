import{gk as v}from"./site-kr23qrtj.js";import{Yy as x}from"./site-2dsa0ab6.js";import{fz as h}from"./site-bmmnqtf5.js";import{uz as u}from"./site-6jttm5w8.js";import{vz as S}from"./site-z6q3x0pt.js";import{Hz as p}from"./site-t3aad17c.js";import{Uz as V}from"./site-zqq9zg2d.js";import{nA as l}from"./site-e1dgx5rz.js";import{oA as c}from"./site-0wedehmd.js";import{pA as n,qA as f}from"./site-ep0mpq5r.js";import{rA as r}from"./site-pvgny3b5.js";import{sA as d}from"./site-j4rsshqj.js";import{tA as s}from"./site-798xczjz.js";import{uA as a}from"./site-6w2nxcx7.js";import{vA as m}from"./site-ygkkxrec.js";import{wA as t}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="shadowOnlyVertexShader",D=`precision highp float;attribute vec3 position;
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

//# debugId=0B591603203BD0BA64756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-gha8q6d6.js.map
