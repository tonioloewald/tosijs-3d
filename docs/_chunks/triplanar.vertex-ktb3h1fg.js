import{jy as Y}from"./site-tdr54sxk.js";import{Dy as _}from"./site-rs9dnmcg.js";import{Ey as $}from"./site-6x55xt9x.js";import{Vy as Z}from"./site-ef54yptm.js";import{Wy as W}from"./site-2ywb8x5w.js";import{Zy as X}from"./site-7fsb8rv3.js";import{az as T}from"./site-bxq8qnzk.js";import{bz as K}from"./site-dwr5s1ha.js";import{cz as L}from"./site-z5fa4raw.js";import{dz as G,ez as O}from"./site-zx8qtfzw.js";import{fz as E}from"./site-f2k7n4ns.js";import{gz as N}from"./site-2e30jbpw.js";import{hz as R}from"./site-c8b9sfgq.js";import{iz as J}from"./site-xa7p3j10.js";import{jz as Q}from"./site-510tzh5c.js";import{kz as H}from"./site-kw5vzqp8.js";import{_B as q}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var B="triplanarVertexShader",w=`precision highp float;attribute vec3 position;
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
`;if(!q.ShadersStore[B])q.ShadersStore[B]=w;var y=[W,E,G,K,H,X,J,_,$,L,N,O,Q,Z,R,Y,T];for(let z of y)if(!q.IncludesShadersStore[z.name])q.IncludesShadersStore[z.name]=z.shader;var V={name:B,shader:w};export{V as triplanarVertexShader};

//# debugId=000070E065168A9364756E2164756E21
//# sourceMappingURL=triplanar.vertex-ktb3h1fg.js.map
