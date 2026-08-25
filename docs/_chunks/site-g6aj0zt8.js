import{Yh as g}from"./site-msfggx7d.js";import{hy as p}from"./site-9b3v5ws9.js";import{iy as D}from"./site-gcmwk749.js";import{jy as R}from"./site-7t4jxzrk.js";import{Vy as x}from"./site-8200q0kv.js";import{Wy as I}from"./site-stjjqyz5.js";import{Yy as E}from"./site-yygbvmyr.js";import{Zy as U}from"./site-kcwst0gf.js";import{bz as l}from"./site-mrme3sf5.js";import{cz as m}from"./site-hkdwmcpe.js";import{dz as a,ez as v}from"./site-1smnc4rx.js";import{fz as f}from"./site-94m3976t.js";import{gz as s}from"./site-fe75yrpf.js";import{hz as V}from"./site-h7bz399p.js";import{iz as c}from"./site-9v0k9401.js";import{jz as u}from"./site-px2b9js0.js";import{kz as d}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";var o="backgroundVertexDeclaration",r=`uniform mat4 view;uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
uniform float shadowLevel;
#ifdef DIFFUSE
uniform mat4 diffuseMatrix;uniform vec2 vDiffuseInfos;
#endif
#ifdef REFLECTION
uniform vec2 vReflectionInfos;uniform mat4 reflectionMatrix;uniform vec3 vReflectionMicrosurfaceInfos;uniform float fFovMultiplier;
#endif
#ifdef POINTSIZE
uniform float pointSize;
#endif
`;if(!e.IncludesShadersStore[o])e.IncludesShadersStore[o]=r;var t={name:o,shader:r};var n="backgroundVertexShader",M=`precision highp float;
#include<__decl__backgroundVertex>
#include<helperFunctions>
attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#ifdef MAINUV1
varying vec2 vMainUV1;
#endif
#ifdef MAINUV2
varying vec2 vMainUV2;
#endif
#if defined(DIFFUSE) && DIFFUSEDIRECTUV==0
varying vec2 vDiffuseUV;
#endif
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#ifdef REFLECTIONMAP_SKYBOX
varying vec3 vPositionUVW;
#endif
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vec3 vDirectionW;
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef REFLECTIONMAP_SKYBOX
vPositionUVW=position;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {gl_Position=viewProjection*finalWorld*vec4(position,1.0);} else {gl_Position=viewProjectionR*finalWorld*vec4(position,1.0);}
#else
gl_Position=viewProjection*finalWorld*vec4(position,1.0);
#endif
vec4 worldPos=finalWorld*vec4(position,1.0);vPositionW=vec3(worldPos);
#ifdef NORMAL
mat3 normalWorld=mat3(finalWorld);
#ifdef NONUNIFORMSCALING
normalWorld=transposeMat3(inverseMat3(normalWorld));
#endif
vNormalW=normalize(normalWorld*normal);
#endif
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
vDirectionW=normalize(vec3(finalWorld*vec4(position,0.0)));
#ifdef EQUIRECTANGULAR_RELFECTION_FOV
mat3 screenToWorld=inverseMat3(mat3(finalWorld*viewProjection));vec3 segment=mix(vDirectionW,screenToWorld*vec3(0.0,0.0,1.0),abs(fFovMultiplier-1.0));if (fFovMultiplier<=1.0) {vDirectionW=normalize(segment);} else {vDirectionW=normalize(vDirectionW+(vDirectionW-segment));}
#endif
#endif
#ifndef UV1
vec2 uv=vec2(0.,0.);
#endif
#ifndef UV2
vec2 uv2=vec2(0.,0.);
#endif
#ifdef MAINUV1
vMainUV1=uv;
#endif
#ifdef MAINUV2
vMainUV2=uv2;
#endif
#if defined(DIFFUSE) && DIFFUSEDIRECTUV==0
if (vDiffuseInfos.x==0.)
{vDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));}
else
{vDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));}
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#ifdef VERTEXCOLOR
vColor=colorUpdated;
#endif
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStore[n])e.ShadersStore[n]=M;var S=[t,E,g,I,f,a,l,d,c,D,p,U,m,s,v,u,V,R,x];for(let i of S)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var Y={name:n,shader:M};
export{Y as Vh};

//# debugId=70D8A10EE88E2C6F64756E2164756E21
//# sourceMappingURL=site-g6aj0zt8.js.map
