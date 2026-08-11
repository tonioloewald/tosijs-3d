import{Jj as x,Kj as y}from"./site-3qpdk318.js";import{wk as w}from"./site-myyfmyk6.js";import{Wy as v}from"./site-58j2ewnw.js";import{_B as f}from"./site-7jxv124x.js";var q="iblDominantDirectionPixelShader",z=`precision highp sampler2D;precision highp samplerCube;
#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
varying vec2 vUV;uniform sampler2D icdfSampler;void main(void) {vec3 lightDir=vec3(0.0,0.0,0.0);for(uint i=0u; i<NUM_SAMPLES; ++i)
{vec2 Xi=hammersley(i,NUM_SAMPLES);vec2 T;T.x=texture2D(icdfSampler,vec2(Xi.x,0.0)).x;T.y=texture2D(icdfSampler,vec2(T.x,Xi.y)).y;vec3 Ls=uv_to_normal(vec2(1.0-fract(T.x+0.25),T.y));lightDir+=Ls;}
lightDir/=float(NUM_SAMPLES);gl_FragColor=vec4(lightDir,1.0);}`;if(!f.ShadersStore[q])f.ShadersStore[q]=z;var A=[v,x,w,y];for(let k of A)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var K={name:q,shader:z};
export{K as ei};

//# debugId=6189D353BD52BE1A64756E2164756E21
//# sourceMappingURL=site-c5ty7c75.js.map
