import{Jj as t,Kj as c}from"./site-gsfcdg3k.js";import{wk as o}from"./site-9mq3sfzz.js";import{Wy as n}from"./site-stjjqyz5.js";import{_B as i}from"./site-ea0e8ybd.js";var r="iblDominantDirectionPixelShader",l=`precision highp sampler2D;precision highp samplerCube;
#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
varying vec2 vUV;uniform sampler2D icdfSampler;void main(void) {vec3 lightDir=vec3(0.0,0.0,0.0);for(uint i=0u; i<NUM_SAMPLES; ++i)
{vec2 Xi=hammersley(i,NUM_SAMPLES);vec2 T;T.x=texture2D(icdfSampler,vec2(Xi.x,0.0)).x;T.y=texture2D(icdfSampler,vec2(T.x,Xi.y)).y;vec3 Ls=uv_to_normal(vec2(1.0-fract(T.x+0.25),T.y));lightDir+=Ls;}
lightDir/=float(NUM_SAMPLES);gl_FragColor=vec4(lightDir,1.0);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=l;var a=[n,t,o,c];for(let e of a)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var h={name:r,shader:l};
export{h as ei};

//# debugId=2B1600F81D3F344564756E2164756E21
//# sourceMappingURL=site-8dr0dn9p.js.map
