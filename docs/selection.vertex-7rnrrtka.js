import{ky as J}from"./site-rfzv46xc.js";import{ly as H}from"./site-31h5gjmd.js";import{my as K}from"./site-6b0meaak.js";import{ny as I}from"./site-wep3rnxy.js";import{bz as z}from"./site-1da3yxp4.js";import{cz as B}from"./site-5dczc761.js";import{dz as w,ez as E}from"./site-r50s22pj.js";import{fz as v}from"./site-jmqgc3tb.js";import{gz as C}from"./site-aat7240y.js";import{jz as F}from"./site-h341dzb9.js";import{kz as y}from"./site-6dmnd63w.js";import{_B as f}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var q="selectionVertexShader",L=`attribute vec3 position;
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

//# debugId=527A3DB939A8B81A64756E2164756E21
//# sourceMappingURL=selection.vertex-7rnrrtka.js.map
