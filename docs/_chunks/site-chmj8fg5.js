import{DD as e}from"./site-53d1aqt6.js";var r="lensFlarePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec4 color;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
vec4 baseColor=texture2D(textureSampler,vUV);gl_FragColor=baseColor*color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var l={name:r,shader:o};
export{l as Vh};

//# debugId=B203A82D561D300964756E2164756E21
//# sourceMappingURL=site-chmj8fg5.js.map
