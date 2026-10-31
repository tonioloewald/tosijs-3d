import{ke,ze,Ee,Ae,Ve,Ge}from"./site-crcg8282.js";import{tn}from"./site-jxn0kfwe.js";import{Ot}from"./site-zyzyq7m9.js";import{Le,Re}from"./site-brhrbsx3.js";import{X}from"./site-z6szqkpd.js";import{ht,vt}from"./site-4rhqjp7v.js";import{Me,De}from"./site-vkgqs56w.js";import{ot}from"./site-vcxc6ktc.js";import{ni}from"./site-r8t8pe6f.js";import{i}from"./site-1yf4ncc8.js";var o="shadowOnlyVertexShader",r=`precision highp float;attribute vec3 position;
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
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[ke,ze,Ee,tn,Ot,Le,X,ht,Me,De,Ae,Ve,Ge,Re,ot,vt,ni];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var T={name:o,shader:r};export{T as shadowOnlyVertexShader};

//# debugId=6223A50E4A1A8A1B64756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-bzqa6j3t.js.map
