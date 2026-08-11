import{Jj as x,Kj as y}from"./site-3qpdk318.js";import{wk as w}from"./site-myyfmyk6.js";import{Wy as v}from"./site-58j2ewnw.js";import{_B as f}from"./site-7jxv124x.js";var q="hdrFilteringPixelShader",z=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform float alphaG;uniform samplerCube inputTexture;uniform vec2 vFilteringInfo;uniform float hdrScale;varying vec3 direction;void main() {vec3 color=radiance(alphaG,inputTexture,direction,vFilteringInfo);gl_FragColor=vec4(color*hdrScale,1.0);}`;if(!f.ShadersStore[q])f.ShadersStore[q]=z;var A=[v,x,w,y];for(let k of A)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var K={name:q,shader:z};
export{K as Ih};

//# debugId=2326D86E5F60E00564756E2164756E21
//# sourceMappingURL=site-nwhhtsr8.js.map
