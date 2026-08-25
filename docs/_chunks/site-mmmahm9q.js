import{Sj as p}from"./site-8dj6zhj9.js";import{Qy as s}from"./site-nmrky29w.js";import{oz as S}from"./site-anrhqzyz.js";import{pz as f}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";var a="bayerDitherFunctions",t=`float bayerDither2(vec2 _P) {return mod(2.0*_P.y+_P.x+1.0,4.0);}
float bayerDither4(vec2 _P) {vec2 P1=mod(_P,2.0); 
vec2 P2=floor(0.5*mod(_P,4.0)); 
return 4.0*bayerDither2(P1)+bayerDither2(P2);}
float bayerDither8(vec2 _P) {vec2 P1=mod(_P,2.0); 
vec2 P2=floor(0.5 *mod(_P,4.0)); 
vec2 P4=floor(0.25*mod(_P,8.0)); 
return 4.0*(4.0*bayerDither2(P1)+bayerDither2(P2))+bayerDither2(P4);}
`;if(!e.IncludesShadersStore[a])e.IncludesShadersStore[a]=t;var n={name:a,shader:t};var o="shadowMapFragmentExtraDeclaration",d=`#if SM_FLOAT==0
#include<packingFunctions>
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#include<bayerDitherFunctions>
uniform vec2 softTransparentShadowSM;
#endif
varying float vDepthMetricSM;
#if SM_USEDISTANCE==1
uniform vec3 lightDataSM;varying vec3 vPositionWSM;
#endif
uniform vec3 biasAndScaleSM;uniform vec2 depthValuesSM;
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying float zSM;
#endif
`;if(!e.IncludesShadersStore[o])e.IncludesShadersStore[o]=d;var c={name:o,shader:d};var i="shadowMapPixelShader",l=`#include<shadowMapFragmentExtraDeclaration>
#ifdef ALPHATEXTURE
varying vec2 vUV;uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{
#include<clipPlaneFragment>
#ifdef ALPHATEXTURE
vec4 opacityMap=texture2D(diffuseSampler,vUV);float alphaFromAlphaTexture=opacityMap.a;
#if SM_SOFTTRANSPARENTSHADOW==1
if (softTransparentShadowSM.y==1.0) {opacityMap.rgb=opacityMap.rgb*vec3(0.3,0.59,0.11);alphaFromAlphaTexture=opacityMap.x+opacityMap.y+opacityMap.z;}
#endif
#ifdef ALPHATESTVALUE
if (alphaFromAlphaTexture<ALPHATESTVALUE)
discard;
#endif
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#ifdef ALPHATEXTURE
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alphaFromAlphaTexture) discard;
#else
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x) discard;
#endif
#endif
#include<shadowMapFragment>
}`;if(!e.ShadersStore[i])e.ShadersStore[i]=l;var m=[s,n,c,f,S,p];for(let r of m)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var x={name:i,shader:l};
export{x as Rj};

//# debugId=38A4B3D3196D3EA364756E2164756E21
//# sourceMappingURL=site-mmmahm9q.js.map
