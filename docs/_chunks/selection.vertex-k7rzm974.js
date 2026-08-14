import{ky as J}from"./site-a7t3w6tt.js";import{ly as H}from"./site-p3a38267.js";import{my as K}from"./site-8azsvrvv.js";import{ny as I}from"./site-me4sbwwy.js";import{bz as z}from"./site-dwr5s1ha.js";import{cz as B}from"./site-z5fa4raw.js";import{dz as w,ez as E}from"./site-zx8qtfzw.js";import{fz as v}from"./site-f2k7n4ns.js";import{gz as C}from"./site-2e30jbpw.js";import{jz as F}from"./site-510tzh5c.js";import{kz as y}from"./site-kw5vzqp8.js";import{_B as f}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var q="selectionVertexShader",L=`attribute vec3 position;
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
`;if(!f.ShadersStore[q])f.ShadersStore[q]=L;var M=[v,w,H,I,y,z,J,K,B,C,E,F];for(let j of M)if(!f.IncludesShadersStore[j.name])f.IncludesShadersStore[j.name]=j.shader;var A={name:q,shader:L};export{A as selectionVertexShader};

//# debugId=8F6FB775618DA29164756E2164756E21
//# sourceMappingURL=selection.vertex-k7rzm974.js.map
