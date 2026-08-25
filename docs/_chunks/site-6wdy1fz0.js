import{Vg as t}from"./site-ctf31wdz.js";import{_B as e}from"./site-ea0e8ybd.js";var r="boundingBoxRendererVertexDeclaration",n=`uniform mat4 world;uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
`;if(!e.IncludesShadersStore[r])e.IncludesShadersStore[r]=n;var d={name:r,shader:n};var i="boundingBoxRendererVertexShader",a=`attribute vec3 position;
#include<__decl__boundingBoxRendererVertex>
#ifdef INSTANCES
attribute vec4 world0;attribute vec4 world1;attribute vec4 world2;attribute vec4 world3;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef INSTANCES
mat4 finalWorld=mat4(world0,world1,world2,world3);vec4 worldPos=finalWorld*vec4(position,1.0);
#else
vec4 worldPos=world*vec4(position,1.0);
#endif
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {gl_Position=viewProjection*worldPos;} else {gl_Position=viewProjectionR*worldPos;}
#else
gl_Position=viewProjection*worldPos;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!e.ShadersStore[i])e.ShadersStore[i]=a;var l=[d,t];for(let o of l)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var m={name:i,shader:a};
export{m as Tg};

//# debugId=59049D2DC008F16264756E2164756E21
//# sourceMappingURL=site-6wdy1fz0.js.map
