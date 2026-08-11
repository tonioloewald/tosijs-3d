import{Vy as O}from"./site-2c0n5b0s.js";import{Xy as K}from"./site-eay31fke.js";import{Yy as J}from"./site-ggwxysr4.js";import{Zy as N}from"./site-vnstybdd.js";import{bz as F}from"./site-1da3yxp4.js";import{cz as G}from"./site-5dczc761.js";import{jz as H}from"./site-h341dzb9.js";import{kz as C}from"./site-6dmnd63w.js";import{_B as f}from"./site-7jxv124x.js";var q="lineVertexDeclaration",y=`uniform mat4 viewProjection;
#define ADDITIONAL_VERTEX_DECLARATION
`;if(!f.IncludesShadersStore[q])f.IncludesShadersStore[q]=y;var z={name:q,shader:y};var v="lineUboDeclaration",A=`layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;if(!f.IncludesShadersStore[v])f.IncludesShadersStore[v]=A;var B={name:v,shader:A};var w="lineVertexShader",Q=`#include<__decl__lineVertex>
#include<instancesDeclaration>
#include<clipPlaneVertexDeclaration>
attribute vec3 position;attribute vec4 normal;uniform float width;uniform float aspectRatio;
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
mat4 worldViewProjection=viewProjection*finalWorld;vec4 viewPosition=worldViewProjection*vec4(position,1.0);vec4 viewPositionNext=worldViewProjection*vec4(normal.xyz,1.0);vec2 currentScreen=viewPosition.xy/viewPosition.w;vec2 nextScreen=viewPositionNext.xy/viewPositionNext.w;currentScreen.x*=aspectRatio;nextScreen.x*=aspectRatio;vec2 dir=normalize(nextScreen-currentScreen);vec2 normalDir=vec2(-dir.y,dir.x);normalDir*=width/2.0;normalDir.x/=aspectRatio;vec4 offset=vec4(normalDir*normal.w,0.0,0.0);gl_Position=viewPosition+offset;
#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
vec4 worldPos=finalWorld*vec4(position,1.0);
#include<clipPlaneVertex>
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!f.ShadersStore[w])f.ShadersStore[w]=Q;var T=[z,J,K,B,F,C,N,G,H,O];for(let k of T)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var V={name:w,shader:Q};
export{V as Yg};

//# debugId=6389A9C317A7450A64756E2164756E21
//# sourceMappingURL=site-psar7tx1.js.map
