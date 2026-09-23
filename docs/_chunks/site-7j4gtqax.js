import{FD as r}from"./site-vrsvvb55.js";var e="anaglyphPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D leftSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec4 leftFrag=texture2D(leftSampler,vUV);leftFrag=vec4(1.0,leftFrag.g,leftFrag.b,1.0);vec4 rightFrag=texture2D(textureSampler,vUV);rightFrag=vec4(rightFrag.r,1.0,1.0,1.0);gl_FragColor=vec4(rightFrag.rgb*leftFrag.rgb,1.0);}`;if(!r.ShadersStore[e])r.ShadersStore[e]=a;var g={name:e,shader:a};
export{g as FA};

//# debugId=89CFBB36695DF21B64756E2164756E21
//# sourceMappingURL=site-7j4gtqax.js.map
