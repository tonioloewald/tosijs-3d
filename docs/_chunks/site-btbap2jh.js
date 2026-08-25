import{_B as e}from"./site-ea0e8ybd.js";var o="postprocessVertexShader",t=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=t;var r={name:o,shader:t};
export{r as JA};

//# debugId=8EB88810E9E0B14C64756E2164756E21
//# sourceMappingURL=site-btbap2jh.js.map
