import{ne}from"./site-nhzwk4kt.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdEncodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=o;var n=[ne];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var VC={name:r,shader:o};
export{VC};

//# debugId=13DF302D1BA2134C64756E2164756E21
//# sourceMappingURL=site-73yf912a.js.map
