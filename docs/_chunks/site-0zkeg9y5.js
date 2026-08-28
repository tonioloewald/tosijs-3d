import{Bz as o}from"./site-6qme1jh9.js";import{Cz as n}from"./site-qmt4t2np.js";import{Fz as s}from"./site-4grmvsrj.js";import{DD as e}from"./site-53d1aqt6.js";var i="imageProcessingPixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
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
export{u as Gk};

//# debugId=23E975FBEF9B0C0864756E2164756E21
//# sourceMappingURL=site-0zkeg9y5.js.map
