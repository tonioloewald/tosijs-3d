import{FD as e}from"./site-vrsvvb55.js";var o="postprocessVertexShader",t=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=t;var r={name:o,shader:t};
export{r as YA};

//# debugId=5EBA6B1E7C2AA4EC64756E2164756E21
//# sourceMappingURL=site-62gys2g3.js.map
