import{FD as e}from"./site-vrsvvb55.js";var r="displayPassPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D passSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(passSampler,vUV);}`;if(!e.ShadersStore[r])e.ShadersStore[r]=a;var o={name:r,shader:a};
export{o as Wg};

//# debugId=DC301A734481F0DB64756E2164756E21
//# sourceMappingURL=site-yjpxx0fk.js.map
