import{jj as t,kj as c}from"./site-n6q7p29j.js";import{rk as o}from"./site-1xqg9nmh.js";import{Fz as n}from"./site-4grmvsrj.js";import{DD as r}from"./site-53d1aqt6.js";var i="hdrIrradianceFilteringPixelShader",d=`#include<helperFunctions>
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
export{F as Bh};

//# debugId=B583D611E4BFC2FB64756E2164756E21
//# sourceMappingURL=site-fg4e6aa6.js.map
