import{Vy as T}from"./site-2c0n5b0s.js";import{Zy as R}from"./site-vnstybdd.js";import{az as Q}from"./site-6mysyne0.js";import{bz as H}from"./site-1da3yxp4.js";import{cz as J}from"./site-5dczc761.js";import{dz as E,ez as L}from"./site-r50s22pj.js";import{fz as B}from"./site-jmqgc3tb.js";import{gz as K}from"./site-aat7240y.js";import{hz as O}from"./site-vg641y8e.js";import{iz as G}from"./site-ah3v37bk.js";import{jz as N}from"./site-h341dzb9.js";import{kz as F}from"./site-6dmnd63w.js";import{_B as q}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var z="fireVertexShader",U=`precision highp float;attribute vec3 position;
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
varying vec2 vDiffuseUV;
#endif
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
uniform float time;uniform float speed;
#ifdef DIFFUSE
varying vec2 vDistortionCoords1;varying vec2 vDistortionCoords2;varying vec2 vDistortionCoords3;
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
#ifdef DIFFUSE
vDiffuseUV=uv;vDiffuseUV.y-=0.2;
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#ifdef DIFFUSE
vec3 layerSpeed=vec3(-0.2,-0.52,-0.1)*speed;vDistortionCoords1.x=uv.x;vDistortionCoords1.y=uv.y+layerSpeed.x*time/1000.0;vDistortionCoords2.x=uv.x;vDistortionCoords2.y=uv.y+layerSpeed.y*time/1000.0;vDistortionCoords3.x=uv.x;vDistortionCoords3.y=uv.y+layerSpeed.z*time/1000.0;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!q.ShadersStore[z])q.ShadersStore[z]=U;var W=[B,E,H,F,R,G,J,K,L,N,T,O,Q];for(let w of W)if(!q.IncludesShadersStore[w.name])q.IncludesShadersStore[w.name]=w.shader;var M={name:z,shader:U};export{M as fireVertexShader};

//# debugId=B20B87418C0C3F7164756E2164756E21
//# sourceMappingURL=fire.vertex-t9xmvknt.js.map
