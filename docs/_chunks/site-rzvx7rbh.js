import{ml as A}from"./site-pq3ytdjv.js";import{_B as b}from"./site-1q3afg48.js";var q="kernelBlurVertex",w="sampleCoord{X}=sampleCenter+delta*KERNEL_OFFSET{X};";if(!b.IncludesShadersStore[q])b.IncludesShadersStore[q]=w;var z={name:q,shader:w};var v="kernelBlurVertexShader",C=`attribute vec2 position;uniform vec2 delta;varying vec2 sampleCenter;
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
sampleCenter=(position*madd+madd);
#include<kernelBlurVertex>[0..varyingCount]
gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[v])b.ShadersStore[v]=C;var F=[A,z];for(let f of F)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var O={name:v,shader:C};
export{O as ll};

//# debugId=643C1BC6F2E62D4E64756E2164756E21
//# sourceMappingURL=site-rzvx7rbh.js.map
