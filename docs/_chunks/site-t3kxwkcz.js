import{jj as t,kj as c}from"./site-n6q7p29j.js";import{rk as o}from"./site-1xqg9nmh.js";import{Fz as n}from"./site-4grmvsrj.js";import{DD as r}from"./site-53d1aqt6.js";var i="hdrFilteringPixelShader",a=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform float alphaG;uniform samplerCube inputTexture;uniform vec2 vFilteringInfo;uniform float hdrScale;varying vec3 direction;void main() {vec3 color=radiance(alphaG,inputTexture,direction,vFilteringInfo);gl_FragColor=vec4(color*hdrScale,1.0);}`;if(!r.ShadersStore[i])r.ShadersStore[i]=a;var l=[n,t,o,c];for(let e of l)if(!r.IncludesShadersStore[e.name])r.IncludesShadersStore[e.name]=e.shader;var p={name:i,shader:a};
export{p as Oh};

//# debugId=E25FAF53DB7A08B464756E2164756E21
//# sourceMappingURL=site-t3kxwkcz.js.map
