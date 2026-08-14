import{ky as K}from"./site-a7t3w6tt.js";import{ly as H}from"./site-p3a38267.js";import{my as L}from"./site-8azsvrvv.js";import{ny as I}from"./site-me4sbwwy.js";import{Vy as M}from"./site-ef54yptm.js";import{Zy as J}from"./site-7fsb8rv3.js";import{bz as z}from"./site-dwr5s1ha.js";import{cz as B}from"./site-z5fa4raw.js";import{dz as w,ez as E}from"./site-zx8qtfzw.js";import{fz as v}from"./site-f2k7n4ns.js";import{gz as C}from"./site-2e30jbpw.js";import{jz as F}from"./site-510tzh5c.js";import{kz as y}from"./site-kw5vzqp8.js";import{_B as f}from"./site-1q3afg48.js";var q="outlineVertexShader",N=`attribute vec3 position;attribute vec3 normal;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
uniform float offset;
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef ALPHATEST
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;vec3 normalUpdated=normal;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
vec3 offsetPosition=positionUpdated+(normalUpdated*offset);
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(offsetPosition,1.0);gl_Position=viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
}
`;if(!f.ShadersStore[q])f.ShadersStore[q]=N;var O=[v,w,H,I,y,z,J,K,L,B,C,E,F,M];for(let j of O)if(!f.IncludesShadersStore[j.name])f.IncludesShadersStore[j.name]=j.shader;var b={name:q,shader:N};
export{b as Eg};

//# debugId=AC47BC488B57821964756E2164756E21
//# sourceMappingURL=site-18f6j5y9.js.map
