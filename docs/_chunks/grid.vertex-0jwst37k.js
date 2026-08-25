import{_j as s}from"./site-0pgrs4f3.js";import{Vy as v}from"./site-8200q0kv.js";import{Yy as f}from"./site-yygbvmyr.js";import{Zy as l}from"./site-kcwst0gf.js";import{bz as n}from"./site-mrme3sf5.js";import{cz as c}from"./site-hkdwmcpe.js";import{hz as d}from"./site-h7bz399p.js";import{iz as t}from"./site-9v0k9401.js";import{jz as a}from"./site-px2b9js0.js";import{kz as r}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="gridVertexShader",p=`precision highp float;attribute vec3 position;attribute vec3 normal;
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

//# debugId=0B252D03C3B5413664756E2164756E21
//# sourceMappingURL=grid.vertex-0jwst37k.js.map
