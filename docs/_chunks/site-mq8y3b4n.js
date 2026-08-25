import{_B as e}from"./site-ea0e8ybd.js";var i="lensFlareVertexShader",o=`attribute vec2 position;uniform mat4 viewportMatrix;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=position*madd+madd;gl_Position=viewportMatrix*vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[i])e.ShadersStore[i]=o;var t={name:i,shader:o};
export{t as Qh};

//# debugId=BFD3F785CA98385864756E2164756E21
//# sourceMappingURL=site-mq8y3b4n.js.map
