import{jy as S}from"./site-7t4jxzrk.js";import{Dy as g}from"./site-xaz59mrc.js";import{Ey as V}from"./site-70kws73r.js";import{Vy as u}from"./site-8200q0kv.js";import{Wy as x}from"./site-stjjqyz5.js";import{Zy as p}from"./site-kcwst0gf.js";import{az as s}from"./site-jc9mf41q.js";import{bz as l}from"./site-mrme3sf5.js";import{cz as d}from"./site-hkdwmcpe.js";import{dz as n,ez as f}from"./site-1smnc4rx.js";import{fz as r}from"./site-94m3976t.js";import{gz as m}from"./site-fe75yrpf.js";import{hz as v}from"./site-h7bz399p.js";import{iz as a}from"./site-9v0k9401.js";import{jz as c}from"./site-px2b9js0.js";import{kz as t}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="triplanarVertexShader",z=`precision highp float;attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<helperFunctions>
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform mat4 view;uniform mat4 viewProjection;
#ifdef DIFFUSEX
varying vec2 vTextureUVX;
#endif
#ifdef DIFFUSEY
varying vec2 vTextureUVY;
#endif
#ifdef DIFFUSEZ
varying vec2 vTextureUVZ;
#endif
uniform float tileSize;
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying mat3 tangentSpace;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
void main(void)
{
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
vec4 colorUpdated=color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);gl_Position=viewProjection*worldPos;vPositionW=vec3(worldPos);
#ifdef DIFFUSEX
vTextureUVX=worldPos.zy/tileSize;
#endif
#ifdef DIFFUSEY
vTextureUVY=worldPos.xz/tileSize;
#endif
#ifdef DIFFUSEZ
vTextureUVZ=worldPos.xy/tileSize;
#endif
#ifdef NORMAL
vec3 xtan=vec3(0,0,1);vec3 xbin=vec3(0,1,0);vec3 ytan=vec3(1,0,0);vec3 ybin=vec3(0,0,1);vec3 ztan=vec3(1,0,0);vec3 zbin=vec3(0,1,0);vec3 normalizedNormal=normalize(normal);normalizedNormal*=normalizedNormal;vec3 worldBinormal=normalize(xbin*normalizedNormal.x+ybin*normalizedNormal.y+zbin*normalizedNormal.z);vec3 worldTangent=normalize(xtan*normalizedNormal.x+ytan*normalizedNormal.y+ztan*normalizedNormal.z);mat3 normalWorld=mat3(finalWorld);
#ifdef NONUNIFORMSCALING
normalWorld=transposeMat3(inverseMat3(normalWorld));
#endif
worldTangent=normalize((normalWorld*worldTangent).xyz);worldBinormal=normalize((normalWorld*worldBinormal).xyz);vec3 worldNormal=normalize((normalWorld*normalize(normal)).xyz);tangentSpace[0]=worldTangent;tangentSpace[1]=worldBinormal;tangentSpace[2]=worldNormal;
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
`;if(!e.ShadersStore[o])e.ShadersStore[o]=z;var N=[x,r,n,l,t,p,a,g,V,d,m,f,c,u,v,S,s];for(let i of N)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var W={name:o,shader:z};export{W as triplanarVertexShader};

//# debugId=25FF52D5636986B364756E2164756E21
//# sourceMappingURL=triplanar.vertex-ffnyystq.js.map
