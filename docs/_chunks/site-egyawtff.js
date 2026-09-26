import{se}from"./site-82m1a6bm.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdEncodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=o;var n=[se];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var SC={name:r,shader:o};
export{SC};

//# debugId=903193A8188D554D64756E2164756E21
//# sourceMappingURL=site-egyawtff.js.map
