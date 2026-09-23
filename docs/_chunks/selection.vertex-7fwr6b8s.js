import{dz as u}from"./site-nn0nygmy.js";import{ez as m}from"./site-f0fs45dy.js";import{fz as p}from"./site-f9zcj7v8.js";import{gz as s}from"./site-5dj2847h.js";import{pA as a}from"./site-px85h4wa.js";import{qA as d}from"./site-1d4pv99f.js";import{rA as o,sA as l}from"./site-fzx6y8wc.js";import{tA as r}from"./site-fd6t4ht9.js";import{uA as f}from"./site-ner59851.js";import{xA as c}from"./site-dywf9vzn.js";import{yA as n}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var t="selectionVertexShader",v=`attribute vec3 position;
#ifdef INSTANCES
attribute float instanceSelectionId;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef STORE_CAMERASPACE_Z
uniform mat4 view;
#else
uniform vec2 depthValues;
#endif
#ifdef INSTANCES
flat varying float vSelectionId;
#endif
#ifdef STORE_CAMERASPACE_Z
varying float vViewPosZ;
#else
varying float vDepthMetric;
#endif
#ifdef ALPHATEST
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vec3 positionUpdated=position;
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
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);gl_Position=viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#ifdef STORE_CAMERASPACE_Z
vViewPosZ=(view*worldPos).z;
#else
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetric=((-gl_Position.z+depthValues.x)/(depthValues.y));
#else
vDepthMetric=((gl_Position.z+depthValues.x)/(depthValues.y));
#endif
#endif
#ifdef INSTANCES
vSelectionId=instanceSelectionId;
#endif
#include<clipPlaneVertex>
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStore[t])e.ShadersStore[t]=v;var V=[r,o,s,m,n,a,p,u,d,f,l,c];for(let i of V)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var I={name:t,shader:v};export{I as selectionVertexShader};

//# debugId=2214639406DA552664756E2164756E21
//# sourceMappingURL=selection.vertex-7fwr6b8s.js.map
