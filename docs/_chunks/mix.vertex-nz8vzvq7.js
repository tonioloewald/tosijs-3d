import{ke,ze,Ae,Ee,Ve,Ge}from"./site-2xn1nvfe.js";import{De,Re}from"./site-qewn2hm8.js";import{j}from"./site-pqh7etjm.js";import{ut,bt}from"./site-a2wnnm3g.js";import{we,Me}from"./site-jphwjgws.js";import{ri}from"./site-c3s1a6xa.js";import{xi}from"./site-ngbd18ge.js";import{nt}from"./site-txac35kq.js";import{i}from"./site-1yf4ncc8.js";var o="mixVertexShader",r=`precision highp float;attribute vec3 position;
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
varying vec2 vTextureUV;uniform mat4 textureMatrix;uniform vec2 vTextureInfos;
#endif
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
#ifdef VERTEXCOLOR
vec4 colorUpdated=color;
#endif
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
if (vTextureInfos.x==0.)
{vTextureUV=vec2(textureMatrix*vec4(uv,1.0,0.0));}
else
{vTextureUV=vec2(textureMatrix*vec4(uv2,1.0,0.0));}
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[ke,ze,Ae,De,j,ut,we,Me,Ee,Ve,Ge,Re,bt,ri,xi,nt];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var T={name:o,shader:r};export{T as mixVertexShader};

//# debugId=200A70B131CA307264756E2164756E21
//# sourceMappingURL=mix.vertex-nz8vzvq7.js.map
