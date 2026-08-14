import{_B as b}from"./site-1q3afg48.js";var f="lensFlareVertexShader",k=`attribute vec2 position;uniform mat4 viewportMatrix;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=position*madd+madd;gl_Position=viewportMatrix*vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var w={name:f,shader:k};
export{w as Qh};

//# debugId=94EAEFD7321E41AC64756E2164756E21
//# sourceMappingURL=site-4gp8hbdx.js.map
