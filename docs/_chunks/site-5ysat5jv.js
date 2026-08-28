import{DD as e}from"./site-53d1aqt6.js";var o="glowMapMergeVertexShader",i=`attribute vec2 position;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=i;var t={name:o,shader:i};
export{t as gl};

//# debugId=DA4BEA505A16388E64756E2164756E21
//# sourceMappingURL=site-5ysat5jv.js.map
