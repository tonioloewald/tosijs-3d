import{DD as e}from"./site-53d1aqt6.js";var i="hdrIrradianceFilteringVertexShader",r=`attribute vec2 position;varying vec3 direction;uniform vec3 up;uniform vec3 right;uniform vec3 front;
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
mat3 view=mat3(up,right,front);direction=view*vec3(position,1.0);gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[i])e.ShadersStore[i]=r;var o={name:i,shader:r};
export{o as Ah};

//# debugId=60F4F62B778576E164756E2164756E21
//# sourceMappingURL=site-gr4x4991.js.map
