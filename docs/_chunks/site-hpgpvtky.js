import{_B as e}from"./site-ea0e8ybd.js";var r="displayPassPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D passSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(passSampler,vUV);}`;if(!e.ShadersStore[r])e.ShadersStore[r]=a;var o={name:r,shader:a};
export{o as bh};

//# debugId=2246C8D1D1C4582C64756E2164756E21
//# sourceMappingURL=site-hpgpvtky.js.map
