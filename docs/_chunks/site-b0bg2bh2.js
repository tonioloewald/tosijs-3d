import{_B as k}from"./site-1q3afg48.js";var q="bloomMergePixelShader",v=`uniform sampler2D textureSampler;uniform sampler2D bloomBlur;varying vec2 vUV;uniform float bloomWeight;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(textureSampler,vUV);vec3 blurred=texture2D(bloomBlur,vUV).rgb;gl_FragColor.rgb=gl_FragColor.rgb+(blurred.rgb*bloomWeight); }
`;if(!k.ShadersStore[q])k.ShadersStore[q]=v;var x={name:q,shader:v};
export{x as Yk};

//# debugId=0645B286E42362E564756E2164756E21
//# sourceMappingURL=site-b0bg2bh2.js.map
