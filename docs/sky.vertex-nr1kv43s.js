import{Vy as E}from"./site-2c0n5b0s.js";import{Zy as C}from"./site-vnstybdd.js";import{hz as B}from"./site-vg641y8e.js";import{iz as z}from"./site-ah3v37bk.js";import{jz as A}from"./site-h341dzb9.js";import{kz as w}from"./site-6dmnd63w.js";import{_B as k}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var v="skyVertexShader",F=`precision highp float;attribute vec3 position;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
uniform mat4 world;uniform mat4 view;uniform mat4 viewProjection;
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<logDepthDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
gl_Position=viewProjection*world*vec4(position,1.0);vec4 worldPos=world*vec4(position,1.0);vPositionW=vec3(worldPos);
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#ifdef VERTEXCOLOR
vColor=color;
#endif
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!k.ShadersStore[v])k.ShadersStore[v]=F;var G=[C,w,z,A,E,B];for(let q of G)if(!k.IncludesShadersStore[q.name])k.IncludesShadersStore[q.name]=q.shader;var Q={name:v,shader:F};export{Q as skyVertexShader};

//# debugId=D6684243FC05551364756E2164756E21
//# sourceMappingURL=sky.vertex-nr1kv43s.js.map
