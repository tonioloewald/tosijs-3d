import{lj as t,mj as c}from"./site-95sep9bd.js";import{tk as o}from"./site-b29n5y33.js";import{Hz as n}from"./site-md667va8.js";import{FD as i}from"./site-vrsvvb55.js";var r="iblDominantDirectionPixelShader",l=`precision highp sampler2D;precision highp samplerCube;
#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
varying vec2 vUV;uniform sampler2D icdfSampler;void main(void) {vec3 lightDir=vec3(0.0,0.0,0.0);for(uint i=0u; i<NUM_SAMPLES; ++i)
{vec2 Xi=hammersley(i,NUM_SAMPLES);vec2 T;T.x=texture2D(icdfSampler,vec2(Xi.x,0.0)).x;T.y=texture2D(icdfSampler,vec2(T.x,Xi.y)).y;vec3 Ls=uv_to_normal(vec2(1.0-fract(T.x+0.25),T.y));lightDir+=Ls;}
lightDir/=float(NUM_SAMPLES);gl_FragColor=vec4(lightDir,1.0);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=l;var a=[n,t,o,c];for(let e of a)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var h={name:r,shader:l};
export{h as oi};

//# debugId=0DBC30D989B8767164756E2164756E21
//# sourceMappingURL=site-bp8pmx8d.js.map
