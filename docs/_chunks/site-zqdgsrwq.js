import{fz as P}from"./site-bmmnqtf5.js";import{Gz as p}from"./site-ht78zrhn.js";import{Hz as S}from"./site-t3aad17c.js";import{Uz as x}from"./site-zqq9zg2d.js";import{nA as s}from"./site-e1dgx5rz.js";import{oA as m}from"./site-0wedehmd.js";import{vA as f}from"./site-ygkkxrec.js";import{wA as d}from"./site-a6n42cp9.js";import{DD as e}from"./site-53d1aqt6.js";var i="lineVertexDeclaration",t=`uniform mat4 viewProjection;
#define ADDITIONAL_VERTEX_DECLARATION
`;if(!e.IncludesShadersStore[i])e.IncludesShadersStore[i]=t;var a={name:i,shader:t};var r="lineUboDeclaration",c=`layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=c;var l={name:r,shader:c};var n="lineVertexShader",D=`#include<__decl__lineVertex>
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
}`;if(!e.ShadersStore[n])e.ShadersStore[n]=D;var u=[a,S,p,l,s,d,x,m,f,P];for(let o of u)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var g={name:n,shader:D};
export{g as Og};

//# debugId=1ED9AA79D17D875164756E2164756E21
//# sourceMappingURL=site-zqdgsrwq.js.map
