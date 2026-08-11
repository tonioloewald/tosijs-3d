import{Wy as k}from"./site-58j2ewnw.js";import{_B as b}from"./site-7jxv124x.js";var g="rgbdDecodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};
export{y as Su};

//# debugId=BC2EB694595F642D64756E2164756E21
//# sourceMappingURL=site-45f04q10.js.map
