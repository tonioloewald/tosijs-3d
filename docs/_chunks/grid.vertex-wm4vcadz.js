import{gk as s}from"./site-kr23qrtj.js";import{fz as v}from"./site-bmmnqtf5.js";import{Hz as f}from"./site-t3aad17c.js";import{Uz as l}from"./site-zqq9zg2d.js";import{nA as n}from"./site-e1dgx5rz.js";import{oA as c}from"./site-0wedehmd.js";import{tA as d}from"./site-798xczjz.js";import{uA as t}from"./site-6w2nxcx7.js";import{vA as a}from"./site-ygkkxrec.js";import{wA as r}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="gridVertexShader",p=`precision highp float;attribute vec3 position;attribute vec3 normal;
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
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=p;var m=[n,s,f,l,t,r,c,d,a,v];for(let i of m)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var h={name:o,shader:p};export{h as gridVertexShader};

//# debugId=05F3B4B696AE40B664756E2164756E21
//# sourceMappingURL=grid.vertex-wm4vcadz.js.map
