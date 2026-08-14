import{Jj as x,Kj as y}from"./site-rqw58sf6.js";import{wk as w}from"./site-pn0eyhg8.js";import{Wy as v}from"./site-2ywb8x5w.js";import{_B as f}from"./site-1q3afg48.js";var q="hdrIrradianceFilteringPixelShader",z=`#include<helperFunctions>
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
);gl_FragColor=vec4(color*hdrScale,1.0);}`;if(!f.ShadersStore[q])f.ShadersStore[q]=z;var A=[v,x,w,y];for(let k of A)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var K={name:q,shader:z};
export{K as Mh};

//# debugId=6008C2885B2514FE64756E2164756E21
//# sourceMappingURL=site-smcg0e6j.js.map
