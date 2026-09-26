import{i}from"./site-1yf4ncc8.js";var e="postprocessVertexShader",o=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!i.ShadersStore[e])i.ShadersStore[e]=o;var GC={name:e,shader:o};
export{GC};

//# debugId=E0F6D1394A07A4A264756E2164756E21
//# sourceMappingURL=site-wgxk168h.js.map
