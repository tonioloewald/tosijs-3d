import{ky as K}from"./site-rfzv46xc.js";import{ly as H}from"./site-31h5gjmd.js";import{my as L}from"./site-6b0meaak.js";import{ny as I}from"./site-wep3rnxy.js";import{Vy as M}from"./site-2c0n5b0s.js";import{Zy as J}from"./site-vnstybdd.js";import{bz as z}from"./site-1da3yxp4.js";import{cz as B}from"./site-5dczc761.js";import{dz as w,ez as E}from"./site-r50s22pj.js";import{fz as v}from"./site-jmqgc3tb.js";import{gz as C}from"./site-aat7240y.js";import{jz as F}from"./site-h341dzb9.js";import{kz as y}from"./site-6dmnd63w.js";import{_B as f}from"./site-7jxv124x.js";var q="outlineVertexShader",N=`attribute vec3 position;attribute vec3 normal;
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

//# debugId=77EA7E0561626F4A64756E2164756E21
//# sourceMappingURL=site-7ncyhs6s.js.map
