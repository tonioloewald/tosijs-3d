import{Mz as s}from"./site-sxz4tpxg.js";import{kA as n}from"./site-ngcgfsjk.js";import{AA as o}from"./site-ar3nhn4n.js";import{_B as e}from"./site-ea0e8ybd.js";var r="spritesVertexShader",v=`attribute position: vec4f;attribute options: vec2f;attribute offsets: vec2f;attribute inverts: vec2f;attribute cellInfo: vec4f;attribute color: vec4f;uniform view: mat4x4f;uniform projection: mat4x4f;varying vUV: vec2f;varying vColor: vec4f;
#include<fogVertexDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
var viewPos: vec3f=(uniforms.view* vec4f(vertexInputs.position.xyz,1.0)).xyz; 
var cornerPos: vec2f;var angle: f32=vertexInputs.position.w;var size: vec2f= vec2f(vertexInputs.options.x,vertexInputs.options.y);var offset: vec2f=vertexInputs.offsets.xy;cornerPos= vec2f(offset.x-0.5,offset.y -0.5)*size;var rotatedCorner: vec3f;rotatedCorner.x=cornerPos.x*cos(angle)-cornerPos.y*sin(angle);rotatedCorner.y=cornerPos.x*sin(angle)+cornerPos.y*cos(angle);rotatedCorner.z=0.;viewPos+=rotatedCorner;vertexOutputs.position=uniforms.projection*vec4f(viewPos,1.0); 
vertexOutputs.vColor=vertexInputs.color;var uvOffset: vec2f= vec2f(abs(offset.x-vertexInputs.inverts.x),abs(1.0-offset.y-vertexInputs.inverts.y));var uvPlace: vec2f=vertexInputs.cellInfo.xy;var uvSize: vec2f=vertexInputs.cellInfo.zw;vertexOutputs.vUV.x=uvPlace.x+uvSize.x*uvOffset.x;vertexOutputs.vUV.y=uvPlace.y+uvSize.y*uvOffset.y;
#ifdef FOG
vertexOutputs.vFogDistance=viewPos;
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=v;var f=[o,n,s];for(let t of f)if(!e.IncludesShadersStoreWGSL[t.name])e.IncludesShadersStoreWGSL[t.name]=t.shader;var x={name:r,shader:v};
export{x as zh};

//# debugId=DAC73D1A726CFB2364756E2164756E21
//# sourceMappingURL=site-dec18b99.js.map
