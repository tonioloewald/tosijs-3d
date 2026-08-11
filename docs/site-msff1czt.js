import{_B as b}from"./site-7jxv124x.js";var f="glowMapMergeVertexShader",k=`attribute vec2 position;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var y={name:f,shader:k};
export{y as cl};

//# debugId=32BD21C6FFAD29F264756E2164756E21
//# sourceMappingURL=site-msff1czt.js.map
