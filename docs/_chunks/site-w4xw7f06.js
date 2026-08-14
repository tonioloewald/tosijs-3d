import{bA as v}from"./site-qr2bwqkn.js";import{mA as q}from"./site-mvqptzb8.js";import{_B as f}from"./site-1q3afg48.js";var p="lightProxyVertexShader",w=`attribute position: vec3f;flat varying vOffset: u32;flat varying vMask: u32;
#include<sceneUboDeclaration>
var lightDataTexture: texture_2d<f32>;uniform tileMaskResolution: vec3f;uniform halfTileRes: vec2f;
#include<clusteredLightingFunctions>
@vertex
fn main(input: VertexInputs)->FragmentInputs {let light=getClusteredLight(lightDataTexture,vertexInputs.instanceIndex);let range=light.vLightFalloff.x;let viewPosition=scene.view*vec4f(light.vLightData.xyz,1);let viewPositionSq=viewPosition*viewPosition;let distSq=viewPositionSq.xy+viewPositionSq.z;let sinSq=(range*range)/distSq;let cosSq=max(1.0-sinSq,vec2f(0.01));let sinCos=vertexInputs.position.xy*sqrt(sinSq*cosSq);
#ifdef RIGHT_HANDED
let rotatedX=mat2x2f(cosSq.x,sinCos.x,-sinCos.x,cosSq.x)*viewPosition.xz;let rotatedY=mat2x2f(cosSq.y,sinCos.y,-sinCos.y,cosSq.y)*viewPosition.yz;
#else
let rotatedX=mat2x2f(cosSq.x,-sinCos.x,sinCos.x,cosSq.x)*viewPosition.xz;let rotatedY=mat2x2f(cosSq.y,-sinCos.y,sinCos.y,cosSq.y)*viewPosition.yz;
#endif
let projX=scene.projection*vec4f(rotatedX.x,0,rotatedX.y,1);let projY=scene.projection*vec4f(0,rotatedY.x,rotatedY.y,1);var projPosition=vec2f(projX.x/max(projX.w,0.01),projY.y/max(projY.w,0.01));projPosition=select(vertexInputs.position.xy,projPosition,cosSq>vec2(0.01));let halfTileRes=uniforms.tileMaskResolution.xy/2.0;var tilePosition=(projPosition+1.0)*halfTileRes;tilePosition=select(floor(tilePosition)-0.01,ceil(tilePosition)+0.01,vertexInputs.position.xy>vec2f(0));vertexOutputs.position=vec4f(tilePosition/halfTileRes-1.0,0,1);vertexOutputs.vOffset=vertexInputs.instanceIndex/CLUSTLIGHT_BATCH;vertexOutputs.vMask=1u<<(vertexInputs.instanceIndex % CLUSTLIGHT_BATCH);}
`;if(!f.ShadersStoreWGSL[p])f.ShadersStoreWGSL[p]=w;var x=[q,v];for(let k of x)if(!f.IncludesShadersStoreWGSL[k.name])f.IncludesShadersStoreWGSL[k.name]=k.shader;var B={name:p,shader:w};
export{B as Rh};

//# debugId=33512EC0B54F1C9964756E2164756E21
//# sourceMappingURL=site-w4xw7f06.js.map
