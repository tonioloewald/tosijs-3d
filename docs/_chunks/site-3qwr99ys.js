import{re}from"./site-ja726rsd.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdDecodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=o;var n=[re];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var RC={name:r,shader:o};
export{RC};

//# debugId=C1E97D2D0111A7B964756E2164756E21
//# sourceMappingURL=site-3qwr99ys.js.map
