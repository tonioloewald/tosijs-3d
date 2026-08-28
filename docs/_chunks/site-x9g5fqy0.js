import{DD as e}from"./site-53d1aqt6.js";var o="postprocessVertexShader",t=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=t;var r={name:o,shader:t};
export{r as WA};

//# debugId=253969E261DAC6A764756E2164756E21
//# sourceMappingURL=site-x9g5fqy0.js.map
