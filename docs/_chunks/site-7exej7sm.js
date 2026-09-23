import{hz as l}from"./site-tjnqvjpr.js";import{Wz as f}from"./site-p2z3c7py.js";import{vA as d}from"./site-bnx70ahp.js";import{wA as t}from"./site-pd495nw5.js";import{xA as n}from"./site-dywf9vzn.js";import{yA as r}from"./site-w0s2hd00.js";import{FD as e}from"./site-vrsvvb55.js";var i="skyVertexShader",a=`precision highp float;attribute vec3 position;
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
`;if(!e.ShadersStore[i])e.ShadersStore[i]=a;var c=[f,r,t,n,l,d];for(let o of c)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var h={name:i,shader:a};
export{h as Zf};

//# debugId=873D0891CC14916A64756E2164756E21
//# sourceMappingURL=site-7exej7sm.js.map
