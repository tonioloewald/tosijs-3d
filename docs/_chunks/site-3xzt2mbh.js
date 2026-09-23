import{lj as t,mj as c}from"./site-95sep9bd.js";import{tk as o}from"./site-b29n5y33.js";import{Hz as n}from"./site-md667va8.js";import{FD as r}from"./site-vrsvvb55.js";var i="hdrIrradianceFilteringPixelShader",d=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform samplerCube inputTexture;
#ifdef IBL_CDF_FILTERING
uniform sampler2D icdfTexture;
#endif
uniform vec2 vFilteringInfo;uniform float hdrScale;varying vec3 direction;void main() {vec3 color=irradiance(inputTexture,direction,vFilteringInfo,0.0,vec3(1.0),direction
#ifdef IBL_CDF_FILTERING
,icdfTexture
#endif
);gl_FragColor=vec4(color*hdrScale,1.0);}`;if(!r.ShadersStore[i])r.ShadersStore[i]=d;var a=[n,t,o,c];for(let e of a)if(!r.IncludesShadersStore[e.name])r.IncludesShadersStore[e.name]=e.shader;var F={name:i,shader:d};
export{F as Dh};

//# debugId=ACB7AA390FB44BB264756E2164756E21
//# sourceMappingURL=site-3xzt2mbh.js.map
