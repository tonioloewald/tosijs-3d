import{Qy as n}from"./site-nmrky29w.js";import{oz as a}from"./site-anrhqzyz.js";import{pz as o}from"./site-rk7my3pn.js";import{_B as e}from"./site-ea0e8ybd.js";var r="depthPixelShader",d=`#ifdef ALPHATEST
varying vec2 vUV;uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
varying float vDepthMetric;
#ifdef PACKED
#include<packingFunctions>
#endif
#ifdef STORE_CAMERASPACE_Z
varying vec4 vViewPos;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (texture2D(diffuseSampler,vUV).a<0.4)
discard;
#endif
#ifdef STORE_CAMERASPACE_Z
#ifdef PACKED
gl_FragColor=pack(vViewPos.z);
#else
gl_FragColor=vec4(vViewPos.z,0.0,0.0,1.0);
#endif
#else
#ifdef NONLINEARDEPTH
#ifdef PACKED
gl_FragColor=pack(gl_FragCoord.z);
#else
gl_FragColor=vec4(gl_FragCoord.z,0.0,0.0,0.0);
#endif
#else
#ifdef PACKED
gl_FragColor=pack(vDepthMetric);
#else
gl_FragColor=vec4(vDepthMetric,0.0,0.0,1.0);
#endif
#endif
#endif
}`;if(!e.ShadersStore[r])e.ShadersStore[r]=d;var f=[o,n,a];for(let i of f)if(!e.IncludesShadersStore[i.name])e.IncludesShadersStore[i.name]=i.shader;var g={name:r,shader:d};
export{g as dj};

//# debugId=BC1ACCE25811FF1164756E2164756E21
//# sourceMappingURL=site-gh6v2xw8.js.map
