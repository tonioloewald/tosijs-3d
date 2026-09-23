import{dz as V}from"./site-nn0nygmy.js";import{ez as s}from"./site-f0fs45dy.js";import{fz as u}from"./site-f9zcj7v8.js";import{gz as m}from"./site-5dj2847h.js";import{hz as v}from"./site-tjnqvjpr.js";import{Wz as p}from"./site-p2z3c7py.js";import{pA as n}from"./site-px85h4wa.js";import{qA as d}from"./site-1d4pv99f.js";import{rA as i,sA as c}from"./site-fzx6y8wc.js";import{tA as r}from"./site-fd6t4ht9.js";import{uA as l}from"./site-ner59851.js";import{xA as f}from"./site-dywf9vzn.js";import{yA as a}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";var o="outlineVertexShader",x=`attribute vec3 position;attribute vec3 normal;
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
`;if(!e.ShadersStore[o])e.ShadersStore[o]=x;var h=[r,i,m,s,a,n,p,u,V,d,l,c,f,v];for(let t of h)if(!e.IncludesShadersStore[t.name])e.IncludesShadersStore[t.name]=t.shader;var j={name:o,shader:x};
export{j as Lg};

//# debugId=0A4213B498EDFA9364756E2164756E21
//# sourceMappingURL=site-wfevk6vx.js.map
