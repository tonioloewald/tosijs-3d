import{fz as l}from"./site-bmmnqtf5.js";import{Uz as f}from"./site-zqq9zg2d.js";import{tA as d}from"./site-798xczjz.js";import{uA as t}from"./site-6w2nxcx7.js";import{vA as n}from"./site-ygkkxrec.js";import{wA as r}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var i="skyVertexShader",a=`precision highp float;attribute vec3 position;
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
`;if(!e.ShadersStore[i])e.ShadersStore[i]=a;var c=[f,r,t,n,l,d];for(let o of c)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var h={name:i,shader:a};export{h as skyVertexShader};

//# debugId=DD4FBC137E7D5B1C64756E2164756E21
//# sourceMappingURL=sky.vertex-5g89mnm3.js.map
