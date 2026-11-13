import{ne}from"./site-nhzwk4kt.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdEncodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=o;var n=[ne];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var QC={name:r,shader:o};
export{QC};

//# debugId=AAA7DE33367DD08C64756E2164756E21
//# sourceMappingURL=site-njxggzmz.js.map
