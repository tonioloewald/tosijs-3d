import{_B as b}from"./site-1q3afg48.js";var f="glowMapMergeVertexShader",k=`attribute vec2 position;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var y={name:f,shader:k};
export{y as cl};

//# debugId=142337B7C03E4F0564756E2164756E21
//# sourceMappingURL=site-ec5cf3h1.js.map
