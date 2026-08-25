import{Wy as t}from"./site-stjjqyz5.js";import{_B as e}from"./site-ea0e8ybd.js";var o="extractHighlightsPixelShader",a=`#include<helperFunctions>
varying vec2 vUV;uniform sampler2D textureSampler;uniform float threshold;uniform float exposure;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);float luma=dot(LuminanceEncodeApprox,gl_FragColor.rgb*exposure);gl_FragColor.rgb=step(threshold,luma)*gl_FragColor.rgb;}`;if(!e.ShadersStore[o])e.ShadersStore[o]=a;var l=[t];for(let r of l)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var s={name:o,shader:a};
export{s as _k};

//# debugId=8BDDBC35C62923CC64756E2164756E21
//# sourceMappingURL=site-zcasm6pm.js.map
