import{_B as e}from"./site-ea0e8ybd.js";var t="layerVertexShader",i=`attribute vec2 position;uniform vec2 scale;uniform vec2 offset;uniform mat4 textureMatrix;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vec2 shiftedPosition=position*scale+offset;vUV=vec2(textureMatrix*vec4(shiftedPosition*madd+madd,1.0,0.0));gl_Position=vec4(shiftedPosition,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[t])e.ShadersStore[t]=i;var r={name:t,shader:i};
export{r as $h};

//# debugId=81214EAE40DE13E964756E2164756E21
//# sourceMappingURL=site-rcy461gt.js.map
