import{oA as V}from"./site-x48q20t3.js";import{pA as d}from"./site-px85h4wa.js";import{qA as c}from"./site-1d4pv99f.js";import{rA as n,sA as f}from"./site-fzx6y8wc.js";import{tA as r}from"./site-fd6t4ht9.js";import{uA as l}from"./site-ner59851.js";import{vA as s}from"./site-bnx70ahp.js";import{wA as a}from"./site-pd495nw5.js";import{xA as m}from"./site-dywf9vzn.js";import{yA as t}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";var i="colorVertexShader",x=`attribute vec3 position;
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
}`;if(!e.ShadersStore[i])e.ShadersStore[i]=x;var p=[r,n,t,a,d,c,l,f,m,s,V];for(let o of p)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var g={name:i,shader:x};
export{g as nA};

//# debugId=CBD8ED98BCD487C764756E2164756E21
//# sourceMappingURL=site-5n80tsh4.js.map
