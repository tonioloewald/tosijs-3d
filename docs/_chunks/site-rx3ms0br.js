import{Jj as t,Kj as c}from"./site-gsfcdg3k.js";import{wk as o}from"./site-9mq3sfzz.js";import{Wy as n}from"./site-stjjqyz5.js";import{_B as r}from"./site-ea0e8ybd.js";var i="hdrIrradianceFilteringPixelShader",d=`#include<helperFunctions>
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
export{F as Mh};

//# debugId=D2AC84F16305663F64756E2164756E21
//# sourceMappingURL=site-rx3ms0br.js.map
