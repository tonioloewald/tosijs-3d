import{Jj as t,Kj as c}from"./site-gsfcdg3k.js";import{wk as o}from"./site-9mq3sfzz.js";import{Wy as n}from"./site-stjjqyz5.js";import{_B as r}from"./site-ea0e8ybd.js";var i="hdrFilteringPixelShader",a=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform float alphaG;uniform samplerCube inputTexture;uniform vec2 vFilteringInfo;uniform float hdrScale;varying vec3 direction;void main() {vec3 color=radiance(alphaG,inputTexture,direction,vFilteringInfo);gl_FragColor=vec4(color*hdrScale,1.0);}`;if(!r.ShadersStore[i])r.ShadersStore[i]=a;var l=[n,t,o,c];for(let e of l)if(!r.IncludesShadersStore[e.name])r.IncludesShadersStore[e.name]=e.shader;var p={name:i,shader:a};
export{p as Ih};

//# debugId=044C5B46B81D09C264756E2164756E21
//# sourceMappingURL=site-16f177dz.js.map
