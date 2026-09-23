import{cz as h}from"./site-mh148btc.js";import{dz as x}from"./site-nn0nygmy.js";import{ez as V}from"./site-f0fs45dy.js";import{fz as v}from"./site-f9zcj7v8.js";import{gz as u}from"./site-5dj2847h.js";import{pA as f}from"./site-px85h4wa.js";import{qA as c}from"./site-1d4pv99f.js";import{rA as d,sA as m}from"./site-fzx6y8wc.js";import{tA as a}from"./site-fd6t4ht9.js";import{uA as s}from"./site-ner59851.js";import{xA as p}from"./site-dywf9vzn.js";import{yA as l}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";var t="pointCloudVertexDeclaration",o=`#ifdef POINTSIZE
uniform float pointSize;
#endif
`;if(!e.IncludesShadersStore[t])e.IncludesShadersStore[t]=o;var n={name:t,shader:o};var r="depthVertexShader",S=`attribute vec3 position;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
#include<instancesDeclaration>
uniform mat4 viewProjection;uniform vec2 depthValues;
#if defined(ALPHATEST) || defined(NEED_UV)
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#ifdef STORE_CAMERASPACE_Z
uniform mat4 view;varying vec4 vViewPos;
#endif
#include<pointCloudVertexDeclaration>
varying float vDepthMetric;
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#include<clipPlaneVertex>
gl_Position=viewProjection*worldPos;
#ifdef STORE_CAMERASPACE_Z
vViewPos=view*worldPos;
#else
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetric=((-gl_Position.z+depthValues.x)/(depthValues.y));
#else
vDepthMetric=((gl_Position.z+depthValues.x)/(depthValues.y));
#endif
#endif
#if defined(ALPHATEST) || defined(BASIC_RENDER)
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<pointCloudVertex>
}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=S;var D=[a,d,u,V,l,f,n,v,x,c,s,m,p,h];for(let i of D)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var G={name:r,shader:S};
export{G as Nj};

//# debugId=FCDD7331A0C8F1D564756E2164756E21
//# sourceMappingURL=site-y2fdavy7.js.map
