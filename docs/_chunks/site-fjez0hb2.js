import{_B as e}from"./site-ea0e8ybd.js";var r="lensFlarePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec4 color;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
vec4 baseColor=texture2D(textureSampler,vUV);gl_FragColor=baseColor*color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var l={name:r,shader:o};
export{l as Ph};

//# debugId=8BCCCF0DECEE8AC664756E2164756E21
//# sourceMappingURL=site-fjez0hb2.js.map
