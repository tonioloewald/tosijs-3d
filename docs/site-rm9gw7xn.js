import{Zx as Z}from"./site-gjkyftvr.js";import{ky as X}from"./site-rfzv46xc.js";import{ly as Q}from"./site-31h5gjmd.js";import{my as Y}from"./site-6b0meaak.js";import{ny as W}from"./site-wep3rnxy.js";import{bz as I}from"./site-1da3yxp4.js";import{cz as J}from"./site-5dczc761.js";import{dz as F,ez as N}from"./site-r50s22pj.js";import{fz as B}from"./site-jmqgc3tb.js";import{gz as K}from"./site-aat7240y.js";import{jz as O}from"./site-h341dzb9.js";import{kz as H}from"./site-6dmnd63w.js";import{_B as f}from"./site-7jxv124x.js";var v="pointCloudVertexDeclaration",y=`#ifdef POINTSIZE
uniform float pointSize;
#endif
`;if(!f.IncludesShadersStore[v])f.IncludesShadersStore[v]=y;var z={name:v,shader:y};var w="depthVertexShader",_=`attribute vec3 position;
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
`;if(!f.ShadersStore[w])f.ShadersStore[w]=_;var $=[B,F,Q,W,H,I,z,X,Y,J,K,N,O,Z];for(let q of $)if(!f.IncludesShadersStore[q.name])f.IncludesShadersStore[q.name]=q.shader;var x={name:w,shader:_};
export{x as cj};

//# debugId=D5546C9F50A23EB964756E2164756E21
//# sourceMappingURL=site-rm9gw7xn.js.map
