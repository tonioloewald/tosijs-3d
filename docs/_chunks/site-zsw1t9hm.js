import{DD as r}from"./site-53d1aqt6.js";var e="bloomMergePixelShader",o=`uniform sampler2D textureSampler;uniform sampler2D bloomBlur;varying vec2 vUV;uniform float bloomWeight;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(textureSampler,vUV);vec3 blurred=texture2D(bloomBlur,vUV).rgb;gl_FragColor.rgb=gl_FragColor.rgb+(blurred.rgb*bloomWeight); }
`;if(!r.ShadersStore[e])r.ShadersStore[e]=o;var t={name:e,shader:o};
export{t as Qk};

//# debugId=79A98E8FCA36C96864756E2164756E21
//# sourceMappingURL=site-zsw1t9hm.js.map
