import{Wy as k}from"./site-58j2ewnw.js";import{_B as b}from"./site-7jxv124x.js";var g="rgbdEncodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};
export{y as Tu};

//# debugId=F45C3F331811508164756E2164756E21
//# sourceMappingURL=site-r5hxtpex.js.map
