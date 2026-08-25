import{_B as r}from"./site-ea0e8ybd.js";var e="anaglyphPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D leftSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec4 leftFrag=texture2D(leftSampler,vUV);leftFrag=vec4(1.0,leftFrag.g,leftFrag.b,1.0);vec4 rightFrag=texture2D(textureSampler,vUV);rightFrag=vec4(rightFrag.r,1.0,1.0,1.0);gl_FragColor=vec4(rightFrag.rgb*leftFrag.rgb,1.0);}`;if(!r.ShadersStore[e])r.ShadersStore[e]=a;var g={name:e,shader:a};
export{g as rz};

//# debugId=9C6011D373720A7B64756E2164756E21
//# sourceMappingURL=site-hp5e536f.js.map
