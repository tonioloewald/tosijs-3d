import{DD as e}from"./site-53d1aqt6.js";var r="displayPassPixelShader",a=`varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D passSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(passSampler,vUV);}`;if(!e.ShadersStore[r])e.ShadersStore[r]=a;var o={name:r,shader:a};
export{o as Ug};

//# debugId=788D1882307C303964756E2164756E21
//# sourceMappingURL=site-6cbe6yn3.js.map
