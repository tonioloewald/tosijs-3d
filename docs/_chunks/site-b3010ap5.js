import{lj as t,mj as c}from"./site-95sep9bd.js";import{tk as o}from"./site-b29n5y33.js";import{Hz as n}from"./site-md667va8.js";import{FD as r}from"./site-vrsvvb55.js";var i="hdrFilteringPixelShader",a=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform float alphaG;uniform samplerCube inputTexture;uniform vec2 vFilteringInfo;uniform float hdrScale;varying vec3 direction;void main() {vec3 color=radiance(alphaG,inputTexture,direction,vFilteringInfo);gl_FragColor=vec4(color*hdrScale,1.0);}`;if(!r.ShadersStore[i])r.ShadersStore[i]=a;var l=[n,t,o,c];for(let e of l)if(!r.IncludesShadersStore[e.name])r.IncludesShadersStore[e.name]=e.shader;var p={name:i,shader:a};
export{p as Qh};

//# debugId=6408A3E19E4CD23E64756E2164756E21
//# sourceMappingURL=site-b3010ap5.js.map
