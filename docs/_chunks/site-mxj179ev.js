import{_B as b}from"./site-1q3afg48.js";var f="proceduralVertexShader",k=`attribute vec2 position;varying vec2 vPosition;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vPosition=position;vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var w={name:f,shader:k};
export{w as Ii};

//# debugId=9A04566CEB6C2FDA64756E2164756E21
//# sourceMappingURL=site-mxj179ev.js.map
