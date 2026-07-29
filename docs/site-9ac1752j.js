import{Jy as v}from"./site-xt9984b7.js";import{Ky as w}from"./site-f571hc4v.js";import{Wy as q}from"./site-58j2ewnw.js";import{_B as b}from"./site-7jxv124x.js";var k="imageProcessingPixelShader",x=`varying vec2 vUV;uniform sampler2D textureSampler;
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

//# debugId=CE7151AAD2B0012364756E2164756E21
//# sourceMappingURL=site-9ac1752j.js.map
