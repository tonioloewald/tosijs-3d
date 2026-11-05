import{ne}from"./site-nhzwk4kt.js";import{i}from"./site-1yf4ncc8.js";var r="rgbdDecodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!i.ShadersStore[r])i.ShadersStore[r]=o;var n=[ne];for(let e of n)if(!i.IncludesShadersStore[e.name])i.IncludesShadersStore[e.name]=e.shader;var VC={name:r,shader:o};
export{VC};

//# debugId=74CBD8AB93C14B9E64756E2164756E21
//# sourceMappingURL=site-2kfyg4ma.js.map
