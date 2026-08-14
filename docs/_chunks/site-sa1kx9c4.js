import{Qy as x}from"./site-hgrba224.js";import{oz as w}from"./site-yh10kg8k.js";import{pz as v}from"./site-b7qcx2vd.js";import{_B as b}from"./site-1q3afg48.js";var q="depthPixelShader",y=`#ifdef ALPHATEST
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
}`;if(!b.ShadersStore[q])b.ShadersStore[q]=y;var z=[v,x,w];for(let f of z)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var G={name:q,shader:y};
export{G as dj};

//# debugId=F1F57ED47FB1A88C64756E2164756E21
//# sourceMappingURL=site-sa1kx9c4.js.map
