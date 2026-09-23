import{Hz as t}from"./site-md667va8.js";import{FD as e}from"./site-vrsvvb55.js";var o="extractHighlightsPixelShader",a=`#include<helperFunctions>
varying vec2 vUV;uniform sampler2D textureSampler;uniform float threshold;uniform float exposure;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);float luma=dot(LuminanceEncodeApprox,gl_FragColor.rgb*exposure);gl_FragColor.rgb=step(threshold,luma)*gl_FragColor.rgb;}`;if(!e.ShadersStore[o])e.ShadersStore[o]=a;var l=[t];for(let r of l)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var s={name:o,shader:a};
export{s as Uk};

//# debugId=FEF76399A10A44F864756E2164756E21
//# sourceMappingURL=site-g2q3bex0.js.map
