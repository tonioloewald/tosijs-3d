import{ke,ze,Ee,Ae,Ve,Ge}from"./site-crcg8282.js";import{Js}from"./site-98nanwbj.js";import{Pt}from"./site-nc27cwdf.js";import{Le,Re}from"./site-brhrbsx3.js";import{Y}from"./site-kthp3mjc.js";import{ht,vt}from"./site-4rhqjp7v.js";import{Me,De}from"./site-70a9z5j8.js";import{ot}from"./site-vcxc6ktc.js";import{si}from"./site-y8hk1n8d.js";import{i}from"./site-1yf4ncc8.js";var o="shadowOnlyVertexShader",r=`precision highp float;attribute vec3 position;
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
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[ke,ze,Ee,Js,Pt,Le,Y,ht,Me,De,Ae,Ve,Ge,Re,ot,vt,si];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var T={name:o,shader:r};export{T as shadowOnlyVertexShader};

//# debugId=D678AEA4B00CB99564756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-pcm8ztwk.js.map
