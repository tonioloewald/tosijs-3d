import{jy as x}from"./site-7t4jxzrk.js";import{Dy as p}from"./site-xaz59mrc.js";import{Ey as S}from"./site-70kws73r.js";import{Vy as V}from"./site-8200q0kv.js";import{Zy as u}from"./site-kcwst0gf.js";import{az as s}from"./site-jc9mf41q.js";import{bz as f}from"./site-mrme3sf5.js";import{cz as d}from"./site-hkdwmcpe.js";import{dz as t,ez as l}from"./site-1smnc4rx.js";import{fz as o}from"./site-94m3976t.js";import{gz as c}from"./site-fe75yrpf.js";import{hz as v}from"./site-h7bz399p.js";import{iz as a}from"./site-9v0k9401.js";import{jz as m}from"./site-px2b9js0.js";import{kz as n}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="terrainVertexShader",g=`precision highp float;attribute vec3 position;
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
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<logDepthDeclaration>
#include<clipPlaneVertexDeclaration>
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
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=g;var T=[o,t,f,u,n,a,p,S,d,c,l,m,V,v,x,s];for(let i of T)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var W={name:r,shader:g};export{W as terrainVertexShader};

//# debugId=120D82FFA383541B64756E2164756E21
//# sourceMappingURL=terrain.vertex-darny7dj.js.map
