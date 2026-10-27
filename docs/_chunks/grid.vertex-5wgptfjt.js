import{Ee,Ae}from"./site-crcg8282.js";import{Js}from"./site-98nanwbj.js";import{Pt}from"./site-nc27cwdf.js";import{Y}from"./site-kthp3mjc.js";import{ht,vt}from"./site-4rhqjp7v.js";import{Le,Re}from"./site-brhrbsx3.js";import{ot}from"./site-vcxc6ktc.js";import{i}from"./site-1yf4ncc8.js";var o="gridVertexShader",r=`precision highp float;attribute vec3 position;attribute vec3 normal;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#include<instancesDeclaration>
#include<__decl__sceneVertex>
varying vec3 vPosition;varying vec3 vNormal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
varying vec3 vWorldPos;
#endif
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#ifdef OPACITY
varying vec2 vOpacityUV;uniform mat4 opacityMatrix;uniform vec2 vOpacityInfos;
#endif
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
vec4 worldPos=finalWorld*vec4(position,1.0);
#include<fogVertex>
vec4 cameraSpacePosition=view*worldPos;gl_Position=projection*cameraSpacePosition;
#ifdef OPACITY
#ifndef UV1
vec2 uv=vec2(0.,0.);
#endif
#ifndef UV2
vec2 uv2=vec2(0.,0.);
#endif
if (vOpacityInfos.x==0.)
{vOpacityUV=vec2(opacityMatrix*vec4(uv,1.0,0.0));}
else
{vOpacityUV=vec2(opacityMatrix*vec4(uv2,1.0,0.0));}
#endif 
#include<clipPlaneVertex>
#include<logDepthVertex>
vPosition=position;vNormal=normal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
vWorldPos=worldPos.xyz;
#endif
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Ee,Js,Pt,Y,ht,Le,Ae,vt,Re,ot];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var u={name:o,shader:r};export{u as gridVertexShader};

//# debugId=84C0AB77D9964A8F64756E2164756E21
//# sourceMappingURL=grid.vertex-5wgptfjt.js.map
