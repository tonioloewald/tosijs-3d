import{Vy as l}from"./site-8200q0kv.js";import{Zy as f}from"./site-kcwst0gf.js";import{hz as d}from"./site-h7bz399p.js";import{iz as t}from"./site-9v0k9401.js";import{jz as n}from"./site-px2b9js0.js";import{kz as r}from"./site-j1geqbhs.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="skyVertexShader",a=`precision highp float;attribute vec3 position;
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

//# debugId=159B7962482B44A364756E2164756E21
//# sourceMappingURL=sky.vertex-vb3crwm3.js.map
