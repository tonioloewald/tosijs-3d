import{Jy as v}from"./site-mcyaspcb.js";import{Ky as w}from"./site-c8qrcs4c.js";import{Wy as q}from"./site-2ywb8x5w.js";import{_B as b}from"./site-1q3afg48.js";var k="imageProcessingPixelShader",x=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<imageProcessingDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec4 result=texture2D(textureSampler,vUV);result.rgb=max(result.rgb,vec3(0.));
#ifdef IMAGEPROCESSING
#ifndef FROMLINEARSPACE
result.rgb=toLinearSpace(result.rgb);
#endif
result=applyImageProcessing(result);
#else
#ifdef FROMLINEARSPACE
result=applyImageProcessing(result);
#endif
#endif
gl_FragColor=result;}`;if(!b.ShadersStore[k])b.ShadersStore[k]=x;var y=[v,q,w];for(let f of y)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var E={name:k,shader:x};
export{E as Ak};

//# debugId=3FBF96785D92B0C164756E2164756E21
//# sourceMappingURL=site-2dvbwzr7.js.map
