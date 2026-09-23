import{hz as p}from"./site-tjnqvjpr.js";import{Wz as u}from"./site-p2z3c7py.js";import{oA as m}from"./site-x48q20t3.js";import{pA as f}from"./site-px85h4wa.js";import{qA as a}from"./site-1d4pv99f.js";import{rA as t,sA as l}from"./site-fzx6y8wc.js";import{tA as r}from"./site-fd6t4ht9.js";import{uA as c}from"./site-ner59851.js";import{vA as v}from"./site-bnx70ahp.js";import{wA as d}from"./site-pd495nw5.js";import{xA as s}from"./site-dywf9vzn.js";import{yA as n}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="fireVertexShader",D=`precision highp float;attribute vec3 position;
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
`;if(!e.ShadersStore[o])e.ShadersStore[o]=D;var x=[r,t,f,n,u,d,a,c,l,s,p,v,m];for(let i of x)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var F={name:o,shader:D};export{F as fireVertexShader};

//# debugId=9435CA0B1DDCD50B64756E2164756E21
//# sourceMappingURL=fire.vertex-rf5kghwj.js.map
