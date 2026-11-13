import{i}from"./site-1yf4ncc8.js";var e="postprocessVertexShader",o=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStore[e])i.ShadersStore[e]=o;var f1={name:e,shader:o};
export{f1};

//# debugId=77142F6052B874F964756E2164756E21
//# sourceMappingURL=site-cyz800s6.js.map
