import{i}from"./site-1yf4ncc8.js";var e="proceduralVertexShader",o=`attribute vec2 position;varying vec2 vPosition;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vPosition=position;vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStore[e])i.ShadersStore[e]=o;var gC={name:e,shader:o};
export{gC};

//# debugId=4A3FDC60B5A98F8564756E2164756E21
//# sourceMappingURL=site-syzwsezt.js.map
