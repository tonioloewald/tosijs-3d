import{Sz as n}from"./site-1n06q2g1.js";import{AA as a}from"./site-mtwqybh7.js";import{BA as o}from"./site-ja5kdh4m.js";import{DD as e}from"./site-53d1aqt6.js";var r="depthPixelShader",d=`#ifdef ALPHATEST
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
export{g as Mj};

//# debugId=B1BEBB4D169B1C0264756E2164756E21
//# sourceMappingURL=site-yzab5c70.js.map
