import{az as O}from"./site-bxq8qnzk.js";import{bz as G}from"./site-dwr5s1ha.js";import{cz as H}from"./site-z5fa4raw.js";import{dz as B,ez as K}from"./site-zx8qtfzw.js";import{fz as z}from"./site-f2k7n4ns.js";import{gz as J}from"./site-2e30jbpw.js";import{hz as N}from"./site-c8b9sfgq.js";import{iz as F}from"./site-xa7p3j10.js";import{jz as L}from"./site-510tzh5c.js";import{kz as E}from"./site-kw5vzqp8.js";import{_B as q}from"./site-1q3afg48.js";var y="colorVertexShader",Q=`attribute vec3 position;
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
}`;if(!q.ShadersStore[y])q.ShadersStore[y]=Q;var R=[z,B,E,F,G,H,J,K,L,N,O];for(let w of R)if(!q.IncludesShadersStore[w.name])q.IncludesShadersStore[w.name]=w.shader;var p={name:y,shader:Q};
export{p as $y};

//# debugId=9C29B910A259393764756E2164756E21
//# sourceMappingURL=site-h0cj25fp.js.map
