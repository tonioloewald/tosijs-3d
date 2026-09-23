import{Dz as o}from"./site-awq1qwme.js";import{Ez as n}from"./site-s8xzdkke.js";import{Hz as s}from"./site-md667va8.js";import{FD as e}from"./site-vrsvvb55.js";var i="imageProcessingPixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
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
export{u as Ik};

//# debugId=8FAE7F5E5A5AB3E464756E2164756E21
//# sourceMappingURL=site-8npvkssy.js.map
