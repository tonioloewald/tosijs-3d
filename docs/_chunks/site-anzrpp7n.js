import{_B as b}from"./site-1q3afg48.js";var f="hdrIrradianceFilteringVertexShader",k=`attribute vec2 position;varying vec3 direction;uniform vec3 up;uniform vec3 right;uniform vec3 front;
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
mat3 view=mat3(up,right,front);direction=view*vec3(position,1.0);gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var w={name:f,shader:k};
export{w as Lh};

//# debugId=B90814A8E4FCB3D464756E2164756E21
//# sourceMappingURL=site-anzrpp7n.js.map
