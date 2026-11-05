import{Ve,Ge,Re,Ee,ze,Ue}from"./site-tkdzstf3.js";import{en}from"./site-k2kv9k5n.js";import{Ot}from"./site-zyzyq7m9.js";import{Ne,Ie}from"./site-qgsdzj16.js";import{X}from"./site-z6szqkpd.js";import{ht,St}from"./site-mbhp9wmg.js";import{De,Le}from"./site-mehfgswz.js";import{ot}from"./site-vcxc6ktc.js";import{oi}from"./site-xkyw153b.js";import{i}from"./site-1yf4ncc8.js";var o="shadowOnlyVertexShader",r=`precision highp float;attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<__decl__sceneVertex>
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
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);gl_Position=viewProjection*worldPos;vPositionW=vec3(worldPos);
#ifdef NORMAL
vNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[Ve,Ge,Re,en,Ot,Ne,X,ht,De,Le,Ee,ze,Ue,Ie,ot,St,oi];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var T={name:o,shader:r};export{T as shadowOnlyVertexShader};

//# debugId=AA53A41AEC16873064756E2164756E21
//# sourceMappingURL=shadowOnly.vertex-yerysjxv.js.map
