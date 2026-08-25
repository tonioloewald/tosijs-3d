import{Jy as n}from"./site-5ghejtqs.js";import{Ky as o}from"./site-9b8qcf3r.js";import{Wy as s}from"./site-stjjqyz5.js";import{_B as e}from"./site-ea0e8ybd.js";var i="imageProcessingPixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
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
gl_FragColor=result;}`;if(!e.ShadersStore[i])e.ShadersStore[i]=t;var a=[n,s,o];for(let r of a)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var u={name:i,shader:t};
export{u as Ak};

//# debugId=933AA4C917231DE664756E2164756E21
//# sourceMappingURL=site-azg3jypc.js.map
