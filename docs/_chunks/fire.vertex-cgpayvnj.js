import{Ve,Ge,Re,Ee,ze,Ue}from"./site-tkdzstf3.js";import{Ne,Ie}from"./site-qgsdzj16.js";import{X}from"./site-z6szqkpd.js";import{ht,St}from"./site-mbhp9wmg.js";import{ot}from"./site-vcxc6ktc.js";import{Si}from"./site-h3fk8wgv.js";import{i}from"./site-1yf4ncc8.js";var o="fireVertexShader",r=`precision highp float;attribute vec3 position;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform mat4 view;uniform mat4 viewProjection;
#ifdef DIFFUSE
varying vec2 vDiffuseUV;
#endif
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
uniform float time;uniform float speed;
#ifdef DIFFUSE
varying vec2 vDistortionCoords1;varying vec2 vDistortionCoords2;varying vec2 vDistortionCoords3;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
vec4 colorUpdated=color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);gl_Position=viewProjection*worldPos;vPositionW=vec3(worldPos);
#ifdef DIFFUSE
vDiffuseUV=uv;vDiffuseUV.y-=0.2;
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#ifdef DIFFUSE
vec3 layerSpeed=vec3(-0.2,-0.52,-0.1)*speed;vDistortionCoords1.x=uv.x;vDistortionCoords1.y=uv.y+layerSpeed.x*time/1000.0;vDistortionCoords2.x=uv.x;vDistortionCoords2.y=uv.y+layerSpeed.y*time/1000.0;vDistortionCoords3.x=uv.x;vDistortionCoords3.y=uv.y+layerSpeed.z*time/1000.0;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var t=[Ve,Ge,Re,Ne,X,ht,Ee,ze,Ue,Ie,ot,St,Si];for(let e of t)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var S={name:o,shader:r};export{S as fireVertexShader};

//# debugId=7650C8ADA27C87C064756E2164756E21
//# sourceMappingURL=fire.vertex-cgpayvnj.js.map
