import{Wy as k}from"./site-2ywb8x5w.js";import{_B as b}from"./site-1q3afg48.js";var g="rgbdEncodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};
export{y as Tu};

//# debugId=6C4CDD720EF130B164756E2164756E21
//# sourceMappingURL=site-2ktrze01.js.map
