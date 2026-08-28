import{Fz as n}from"./site-4grmvsrj.js";import{DD as e}from"./site-53d1aqt6.js";var o="rgbdDecodePixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!e.ShadersStore[o])e.ShadersStore[o]=t;var d=[n];for(let r of d)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var s={name:o,shader:t};
export{s as Ux};

//# debugId=4E8D9017DEA0759264756E2164756E21
//# sourceMappingURL=site-hxrpmqwv.js.map
