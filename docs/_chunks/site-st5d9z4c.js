import{Vg as z}from"./site-mss3tep3.js";import{_B as f}from"./site-1q3afg48.js";var q="boundingBoxRendererVertexDeclaration",w=`uniform mat4 world;uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
`;if(!f.IncludesShadersStore[q])f.IncludesShadersStore[q]=w;var y={name:q,shader:w};var v="boundingBoxRendererVertexShader",A=`attribute vec3 position;
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
`;if(!f.ShadersStore[v])f.ShadersStore[v]=A;var C=[y,z];for(let k of C)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var K={name:v,shader:A};
export{K as Tg};

//# debugId=715339BFDBC312E564756E2164756E21
//# sourceMappingURL=site-st5d9z4c.js.map
