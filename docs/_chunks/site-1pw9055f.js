import{ml as d}from"./site-2vj2b5a1.js";import{_B as e}from"./site-ea0e8ybd.js";var n="kernelBlurVertex",t="sampleCoord{X}=sampleCenter+delta*KERNEL_OFFSET{X};";if(!e.IncludesShadersStore[n])e.IncludesShadersStore[n]=t;var a={name:n,shader:t};var o="kernelBlurVertexShader",i=`attribute vec2 position;uniform vec2 delta;varying vec2 sampleCenter;
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
sampleCenter=(position*madd+madd);
#include<kernelBlurVertex>[0..varyingCount]
gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=i;var l=[d,a];for(let r of l)if(!e.IncludesShadersStore[r.name])e.IncludesShadersStore[r.name]=r.shader;var f={name:o,shader:i};
export{f as ll};

//# debugId=067CAA46705BB05A64756E2164756E21
//# sourceMappingURL=site-1pw9055f.js.map
