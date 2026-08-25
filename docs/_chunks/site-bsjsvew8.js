import{Wy as n}from"./site-stjjqyz5.js";import{_B as e}from"./site-ea0e8ybd.js";var o="rgbdEncodePixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!e.ShadersStore[o])e.ShadersStore[o]=t;var d=[n];for(let r of d)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var s={name:o,shader:t};
export{s as Tu};

//# debugId=8459D7E1EAF0F4A164756E2164756E21
//# sourceMappingURL=site-bsjsvew8.js.map
