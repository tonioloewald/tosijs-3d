import{Fz as a}from"./site-4grmvsrj.js";import{DD as e}from"./site-53d1aqt6.js";var o="grainPixelShader",n=`#include<helperFunctions>
uniform sampler2D textureSampler; 
uniform float intensity;uniform float animatedSeed;varying vec2 vUV;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(textureSampler,vUV);vec2 seed=vUV*(animatedSeed);float grain=dither(seed,intensity);float lum=getLuminance(gl_FragColor.rgb);float grainAmount=(cos(-PI+(lum*PI*2.))+1.)/2.;gl_FragColor.rgb+=grain*grainAmount;gl_FragColor.rgb=max(gl_FragColor.rgb,0.0);}`;if(!e.ShadersStore[o])e.ShadersStore[o]=n;var t=[a];for(let r of t)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var d={name:o,shader:n};
export{d as Ek};

//# debugId=78C37BD800D6819964756E2164756E21
//# sourceMappingURL=site-qh65s877.js.map
