import{mA as V}from"./site-5hpywt0t.js";import{nA as d}from"./site-e1dgx5rz.js";import{oA as c}from"./site-0wedehmd.js";import{pA as n,qA as f}from"./site-ep0mpq5r.js";import{rA as r}from"./site-pvgny3b5.js";import{sA as l}from"./site-j4rsshqj.js";import{tA as s}from"./site-798xczjz.js";import{uA as a}from"./site-6w2nxcx7.js";import{vA as m}from"./site-ygkkxrec.js";import{wA as t}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";var i="colorVertexShader",x=`attribute vec3 position;
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
export{g as lA};

//# debugId=C5AE175FEE6E4BB964756E2164756E21
//# sourceMappingURL=site-p79wt6xp.js.map
