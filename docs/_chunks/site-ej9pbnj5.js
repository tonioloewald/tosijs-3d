import{_B as b}from"./site-1q3afg48.js";var k="displayPassPixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D passSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(passSampler,vUV);}`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as bh};

//# debugId=4FCC32448DDBB89E64756E2164756E21
//# sourceMappingURL=site-ej9pbnj5.js.map
