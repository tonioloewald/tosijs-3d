import{ne}from"./site-nhzwk4kt.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdDecodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=o;var n=[ne];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var HC={name:r,shader:o};
export{HC};

//# debugId=D0627B84ABF08CA264756E2164756E21
//# sourceMappingURL=site-8swfsd5n.js.map
