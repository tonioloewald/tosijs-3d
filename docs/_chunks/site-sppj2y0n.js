import{Wy as k}from"./site-2ywb8x5w.js";import{_B as b}from"./site-1q3afg48.js";var g="extractHighlightsPixelShader",q=`#include<helperFunctions>
varying vec2 vUV;uniform sampler2D textureSampler;uniform float threshold;uniform float exposure;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);float luma=dot(LuminanceEncodeApprox,gl_FragColor.rgb*exposure);gl_FragColor.rgb=step(threshold,luma)*gl_FragColor.rgb;}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};
export{y as _k};

//# debugId=4D1F59F8B1A538A364756E2164756E21
//# sourceMappingURL=site-sppj2y0n.js.map
