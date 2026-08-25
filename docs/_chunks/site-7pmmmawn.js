import{Vy as n}from"./site-8200q0kv.js";import{Zy as i}from"./site-kcwst0gf.js";import{iz as r}from"./site-9v0k9401.js";import{_B as e}from"./site-ea0e8ybd.js";var t="spritesVertexShader",s=`attribute vec4 position;attribute vec2 options;attribute vec2 offsets;attribute vec2 inverts;attribute vec4 cellInfo;attribute vec4 color;uniform mat4 view;uniform mat4 projection;varying vec2 vUV;varying vec4 vColor;
#include<fogVertexDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vec3 viewPos=(view*vec4(position.xyz,1.0)).xyz; 
vec2 cornerPos;float angle=position.w;vec2 size=vec2(options.x,options.y);vec2 offset=offsets.xy;cornerPos=vec2(offset.x-0.5,offset.y -0.5)*size;vec3 rotatedCorner;rotatedCorner.x=cornerPos.x*cos(angle)-cornerPos.y*sin(angle);rotatedCorner.y=cornerPos.x*sin(angle)+cornerPos.y*cos(angle);rotatedCorner.z=0.;viewPos+=rotatedCorner;gl_Position=projection*vec4(viewPos,1.0); 
vColor=color;vec2 uvOffset=vec2(abs(offset.x-inverts.x),abs(1.0-offset.y-inverts.y));vec2 uvPlace=cellInfo.xy;vec2 uvSize=cellInfo.zw;vUV.x=uvPlace.x+uvSize.x*uvOffset.x;vUV.y=uvPlace.y+uvSize.y*uvOffset.y;
#ifdef FOG
vFogDistance=viewPos;
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStore[t])e.ShadersStore[t]=s;var c=[r,i,n];for(let o of c)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var d={name:t,shader:s};
export{d as Ch};

//# debugId=ED5E7DF457E7AF4B64756E2164756E21
//# sourceMappingURL=site-7pmmmawn.js.map
