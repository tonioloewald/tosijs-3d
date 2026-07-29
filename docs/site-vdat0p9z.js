import{az as O}from"./site-6mysyne0.js";import{bz as G}from"./site-1da3yxp4.js";import{cz as H}from"./site-5dczc761.js";import{dz as B,ez as K}from"./site-r50s22pj.js";import{fz as z}from"./site-jmqgc3tb.js";import{gz as J}from"./site-aat7240y.js";import{hz as N}from"./site-vg641y8e.js";import{iz as F}from"./site-ah3v37bk.js";import{jz as L}from"./site-h341dzb9.js";import{kz as E}from"./site-6dmnd63w.js";import{_B as q}from"./site-7jxv124x.js";var y="colorVertexShader",Q=`attribute vec3 position;
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

//# debugId=A62B51AEE477BC2364756E2164756E21
//# sourceMappingURL=site-vdat0p9z.js.map
