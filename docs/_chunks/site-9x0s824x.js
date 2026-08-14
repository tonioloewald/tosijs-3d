import{_B as b}from"./site-1q3afg48.js";var k="lensFlarePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec4 color;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
vec4 baseColor=texture2D(textureSampler,vUV);gl_FragColor=baseColor*color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as Ph};

//# debugId=4FE4418B7B3B3A3C64756E2164756E21
//# sourceMappingURL=site-9x0s824x.js.map
