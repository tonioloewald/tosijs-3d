import{Fe,Ge,Ae,Ce,ke,ze}from"./site-cby3p8g9.js";import{we,Re}from"./site-szcpdvyx.js";import{ct,_t}from"./site-pq1eaaxg.js";import{_i}from"./site-d5h6mywt.js";import{i}from"./site-1yf4ncc8.js";var o="colorVertexShader",r=`attribute vec3 position;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform mat4 view;
#endif
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
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
vec4 worldPos=finalWorld*vec4(position,1.0);
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {gl_Position=viewProjection*worldPos;} else {gl_Position=viewProjectionR*worldPos;}
#else
gl_Position=viewProjection*worldPos;
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[Fe,Ge,we,ct,Ae,Ce,ke,ze,Re,_t,_i];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var VC={name:o,shader:r};
export{VC};

//# debugId=FEAFC90C0BF7A7C764756E2164756E21
//# sourceMappingURL=site-ccy57xtn.js.map
