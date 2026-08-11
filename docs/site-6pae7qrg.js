import{_B as k}from"./site-7jxv124x.js";var q="bloomMergePixelShader",v=`uniform sampler2D textureSampler;uniform sampler2D bloomBlur;varying vec2 vUV;uniform float bloomWeight;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(textureSampler,vUV);vec3 blurred=texture2D(bloomBlur,vUV).rgb;gl_FragColor.rgb=gl_FragColor.rgb+(blurred.rgb*bloomWeight); }
`;if(!k.ShadersStore[q])k.ShadersStore[q]=v;var x={name:q,shader:v};
export{x as Yk};

//# debugId=DCD58CAC976B659A64756E2164756E21
//# sourceMappingURL=site-6pae7qrg.js.map
