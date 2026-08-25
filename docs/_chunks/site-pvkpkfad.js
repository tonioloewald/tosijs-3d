import{ky as u}from"./site-669y2q89.js";import{ly as m}from"./site-vxe7fynz.js";import{my as V}from"./site-2qqvh5ah.js";import{ny as s}from"./site-7qs7fydd.js";import{Vy as v}from"./site-8200q0kv.js";import{Zy as p}from"./site-kcwst0gf.js";import{bz as n}from"./site-mrme3sf5.js";import{cz as d}from"./site-hkdwmcpe.js";import{dz as i,ez as c}from"./site-1smnc4rx.js";import{fz as r}from"./site-94m3976t.js";import{gz as l}from"./site-fe75yrpf.js";import{jz as f}from"./site-px2b9js0.js";import{kz as a}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";var o="outlineVertexShader",x=`attribute vec3 position;attribute vec3 normal;
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
export{j as Eg};

//# debugId=49E60F6EA187F68064756E2164756E21
//# sourceMappingURL=site-pvkpkfad.js.map
