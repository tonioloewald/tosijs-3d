import{i}from"./site-1yf4ncc8.js";var e="proceduralVertexShader",o=`attribute vec2 position;varying vec2 vPosition;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vPosition=position;vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStore[e])i.ShadersStore[e]=o;var $T={name:e,shader:o};
export{$T};

//# debugId=1CD58644053DD2D664756E2164756E21
//# sourceMappingURL=site-c4j4h3q5.js.map
