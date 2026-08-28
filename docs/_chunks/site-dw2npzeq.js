import{Fz as n}from"./site-4grmvsrj.js";import{DD as e}from"./site-53d1aqt6.js";var o="rgbdEncodePixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!e.ShadersStore[o])e.ShadersStore[o]=t;var d=[n];for(let r of d)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var s={name:o,shader:t};
export{s as Ct};

//# debugId=3921C4708A41562E64756E2164756E21
//# sourceMappingURL=site-dw2npzeq.js.map
