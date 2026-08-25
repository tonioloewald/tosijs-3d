import{Mz as l}from"./site-sxz4tpxg.js";import{kA as s}from"./site-ngcgfsjk.js";import{lA as f}from"./site-8w53hv8c.js";import{mA as a}from"./site-1nn7frmg.js";import{tA as t}from"./site-r9g7b3jk.js";import{vA as o}from"./site-a7gatv2c.js";import{BA as c}from"./site-35gh5jpy.js";import{CA as i}from"./site-8e5raghy.js";import{_B as e}from"./site-ea0e8ybd.js";var n="lineVertexShader",d=`#define ADDITIONAL_VERTEX_DECLARATION
#include<instancesDeclaration>
#include<clipPlaneVertexDeclaration>
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position: vec3f;attribute normal: vec4f;uniform width: f32;uniform aspectRatio: f32;
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
var worldViewProjection: mat4x4f=scene.viewProjection*finalWorld;var viewPosition: vec4f=worldViewProjection* vec4f(vertexInputs.position,1.0);var viewPositionNext: vec4f=worldViewProjection* vec4f(vertexInputs.normal.xyz,1.0);var currentScreen: vec2f=viewPosition.xy/viewPosition.w;var nextScreen: vec2f=viewPositionNext.xy/viewPositionNext.w;currentScreen=vec2f(currentScreen.x*uniforms.aspectRatio,currentScreen.y);nextScreen=vec2f(nextScreen.x*uniforms.aspectRatio,nextScreen.y);var dir: vec2f=normalize(nextScreen-currentScreen);var normalDir: vec2f= vec2f(-dir.y,dir.x);normalDir*=uniforms.width/2.0;normalDir=vec2f(normalDir.x/uniforms.aspectRatio,normalDir.y);var offset: vec4f= vec4f(normalDir*vertexInputs.normal.w,0.0,0.0);vertexOutputs.position=viewPosition+offset;
#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
var worldPos: vec4f=finalWorld*vec4f(vertexInputs.position,1.0);
#include<clipPlaneVertex>
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`;if(!e.ShadersStoreWGSL[n])e.ShadersStoreWGSL[n]=d;var m=[t,i,a,f,s,o,c,l];for(let r of m)if(!e.IncludesShadersStoreWGSL[r.name])e.IncludesShadersStoreWGSL[r.name]=r.shader;var w={name:n,shader:d};
export{w as Wg};

//# debugId=35C4D6C419961F9964756E2164756E21
//# sourceMappingURL=site-w98m5a2z.js.map
