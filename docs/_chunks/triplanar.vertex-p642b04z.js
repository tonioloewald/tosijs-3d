import{ne}from"./site-nhzwk4kt.js";import{ke,ze,Ee,Ae,Ve,Ge}from"./site-crcg8282.js";import{Le,Re}from"./site-brhrbsx3.js";import{Y}from"./site-kthp3mjc.js";import{ht,vt}from"./site-4rhqjp7v.js";import{Me,De}from"./site-70a9z5j8.js";import{ot}from"./site-vcxc6ktc.js";import{si}from"./site-y8hk1n8d.js";import{bi}from"./site-57ck3y08.js";import{i}from"./site-1yf4ncc8.js";var o="triplanarVertexShader",r=`precision highp float;attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<helperFunctions>
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform mat4 view;uniform mat4 viewProjection;
#ifdef DIFFUSEX
varying vec2 vTextureUVX;
#endif
#ifdef DIFFUSEY
varying vec2 vTextureUVY;
#endif
#ifdef DIFFUSEZ
varying vec2 vTextureUVZ;
#endif
uniform float tileSize;
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying mat3 tangentSpace;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
vec4 colorUpdated=color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);gl_Position=viewProjection*worldPos;vPositionW=vec3(worldPos);
#ifdef DIFFUSEX
vTextureUVX=worldPos.zy/tileSize;
#endif
#ifdef DIFFUSEY
vTextureUVY=worldPos.xz/tileSize;
#endif
#ifdef DIFFUSEZ
vTextureUVZ=worldPos.xy/tileSize;
#endif
#ifdef NORMAL
vec3 xtan=vec3(0,0,1);vec3 xbin=vec3(0,1,0);vec3 ytan=vec3(1,0,0);vec3 ybin=vec3(0,0,1);vec3 ztan=vec3(1,0,0);vec3 zbin=vec3(0,1,0);vec3 normalizedNormal=normalize(normal);normalizedNormal*=normalizedNormal;vec3 worldBinormal=normalize(xbin*normalizedNormal.x+ybin*normalizedNormal.y+zbin*normalizedNormal.z);vec3 worldTangent=normalize(xtan*normalizedNormal.x+ytan*normalizedNormal.y+ztan*normalizedNormal.z);mat3 normalWorld=mat3(finalWorld);
#ifdef NONUNIFORMSCALING
normalWorld=transposeMat3(inverseMat3(normalWorld));
#endif
worldTangent=normalize((normalWorld*worldTangent).xyz);worldBinormal=normalize((normalWorld*worldBinormal).xyz);vec3 worldNormal=normalize((normalWorld*normalize(normal)).xyz);tangentSpace[0]=worldTangent;tangentSpace[1]=worldBinormal;tangentSpace[2]=worldNormal;
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#include<vertexColorMixing>
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!i.ShadersStore[o])i.ShadersStore[o]=r;var n=[ne,ke,ze,Ee,Le,Y,ht,Me,De,Ae,Ve,Ge,Re,ot,vt,si,bi];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var D={name:o,shader:r};export{D as triplanarVertexShader};

//# debugId=FA4657087707E6EC64756E2164756E21
//# sourceMappingURL=triplanar.vertex-p642b04z.js.map
