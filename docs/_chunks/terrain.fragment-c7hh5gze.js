import{Eh as g}from"./site-mb72han0.js";import{qy as s}from"./site-72dgepe5.js";import{sy as c}from"./site-md6yscb8.js";import"./site-6gx37fkj.js";import{Cy as p}from"./site-0z2v5mk8.js";import{Dy as m}from"./site-xaz59mrc.js";import{Ey as d}from"./site-70kws73r.js";import"./site-vcpzbmwe.js";import{Gy as u}from"./site-ym5bqgnm.js";import{Ry as v}from"./site-f6yefxyf.js";import{Wy as l}from"./site-stjjqyz5.js";import{Zy as t}from"./site-kcwst0gf.js";import{mz as f}from"./site-xr0t1fx0.js";import{nz as a}from"./site-npmkqrmh.js";import{oz as n}from"./site-anrhqzyz.js";import{pz as i}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var o="terrainPixelShader",C=`precision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;
#ifdef SPECULARTERM
uniform vec4 vSpecularColor;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#include<helperFunctions>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#ifdef DIFFUSE
varying vec2 vTextureUV;uniform sampler2D textureSampler;uniform vec2 vTextureInfos;uniform sampler2D diffuse1Sampler;uniform sampler2D diffuse2Sampler;uniform sampler2D diffuse3Sampler;uniform vec2 diffuse1Infos;uniform vec2 diffuse2Infos;uniform vec2 diffuse3Infos;
#endif
#ifdef BUMP
uniform sampler2D bump1Sampler;uniform sampler2D bump2Sampler;uniform sampler2D bump3Sampler;
#endif
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef BUMP
#extension GL_OES_standard_derivatives : enable
mat3 cotangent_frame(vec3 normal,vec3 p,vec2 uv)
{vec3 dp1=dFdx(p);vec3 dp2=dFdy(p);vec2 duv1=dFdx(uv);vec2 duv2=dFdy(uv);vec3 dp2perp=cross(dp2,normal);vec3 dp1perp=cross(normal,dp1);vec3 tangent=dp2perp*duv1.x+dp1perp*duv2.x;vec3 binormal=dp2perp*duv1.y+dp1perp*duv2.y;float invmax=inversesqrt(max(dot(tangent,tangent),dot(binormal,binormal)));return mat3(tangent*invmax,binormal*invmax,normal);}
vec3 perturbNormal(vec3 viewDir,vec3 mixColor)
{vec3 bump1Color=texture2D(bump1Sampler,vTextureUV*diffuse1Infos).xyz;vec3 bump2Color=texture2D(bump2Sampler,vTextureUV*diffuse2Infos).xyz;vec3 bump3Color=texture2D(bump3Sampler,vTextureUV*diffuse3Infos).xyz;bump1Color.rgb*=mixColor.r;bump2Color.rgb=mix(bump1Color.rgb,bump2Color.rgb,mixColor.g);vec3 map=mix(bump2Color.rgb,bump3Color.rgb,mixColor.b);map=map*255./127.-128./127.;mat3 TBN=cotangent_frame(vNormalW*vTextureInfos.y,-viewDir,vTextureUV);return normalize(TBN*map);}
#endif
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);vec4 baseColor=vec4(1.,1.,1.,1.);vec3 diffuseColor=vDiffuseColor.rgb;
#ifdef SPECULARTERM
float glossiness=vSpecularColor.a;vec3 specularColor=vSpecularColor.rgb;
#else
float glossiness=0.;
#endif
float alpha=vDiffuseColor.a;
#ifdef NORMAL
vec3 normalW=normalize(vNormalW);
#else
vec3 normalW=vec3(1.0,1.0,1.0);
#endif
#ifdef DIFFUSE
baseColor=texture2D(textureSampler,vTextureUV);
#if defined(BUMP) && defined(DIFFUSE)
normalW=perturbNormal(viewDirectionW,baseColor.rgb);
#endif
#ifdef ALPHATEST
if (baseColor.a<0.4)
discard;
#endif
#include<depthPrePass>
baseColor.rgb*=vTextureInfos.y;vec4 diffuse1Color=texture2D(diffuse1Sampler,vTextureUV*diffuse1Infos);vec4 diffuse2Color=texture2D(diffuse2Sampler,vTextureUV*diffuse2Infos);vec4 diffuse3Color=texture2D(diffuse3Sampler,vTextureUV*diffuse3Infos);diffuse1Color.rgb*=baseColor.r;diffuse2Color.rgb=mix(diffuse1Color.rgb,diffuse2Color.rgb,baseColor.g);baseColor.rgb=mix(diffuse2Color.rgb,diffuse3Color.rgb,baseColor.b);
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
baseColor.rgb*=vColor.rgb;
#endif
vec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float aggShadow=0.;float numLights=0.;
#ifdef SPECULARTERM
vec3 specularBase=vec3(0.,0.,0.);
#endif
#include<lightFragment>[0..maxSimultaneousLights]
#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)
alpha*=vColor.a;
#endif
#ifdef SPECULARTERM
vec3 finalSpecular=specularBase*specularColor;
#else
vec3 finalSpecular=vec3(0.0);
#endif
vec3 finalDiffuse=clamp(diffuseBase*diffuseColor*baseColor.rgb,0.0,1.0);vec4 color=vec4(finalDiffuse+finalSpecular,alpha);
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStore[o])e.ShadersStore[o]=C;var S=[l,m,d,s,u,i,t,f,n,p,c,v,a,g];for(let r of S)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var y={name:o,shader:C};export{y as terrainPixelShader};

//# debugId=57443E6C0A12C73464756E2164756E21
//# sourceMappingURL=terrain.fragment-c7hh5gze.js.map
