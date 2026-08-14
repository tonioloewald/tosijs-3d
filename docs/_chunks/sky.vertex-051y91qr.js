import{Vy as E}from"./site-ef54yptm.js";import{Zy as C}from"./site-7fsb8rv3.js";import{hz as B}from"./site-c8b9sfgq.js";import{iz as z}from"./site-xa7p3j10.js";import{jz as A}from"./site-510tzh5c.js";import{kz as w}from"./site-kw5vzqp8.js";import{_B as k}from"./site-1q3afg48.js";import"./site-cxzb117e.js";var v="skyVertexShader",F=`precision highp float;attribute vec3 position;
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

//# debugId=1454E95A8972FEE164756E2164756E21
//# sourceMappingURL=sky.vertex-051y91qr.js.map
