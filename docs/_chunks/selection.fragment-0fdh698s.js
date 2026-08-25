import{GA as f}from"./site-4ghhz517.js";import{HA as i}from"./site-42gdhacc.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="selectionPixelShader",t=`#ifdef INSTANCES
flat varying vSelectionId: f32;
#else
uniform selectionId: f32;
#endif
#ifdef STORE_CAMERASPACE_Z
varying vViewPosZ: f32;
#else
varying vDepthMetric: f32;
#endif
#ifdef ALPHATEST
varying vUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;
#endif
#include<clipPlaneFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vUV).a<0.4) {discard;}
#endif
#ifdef INSTANCES
var id: f32=fragmentInputs.vSelectionId;
#else
var id: f32=uniforms.selectionId;
#endif
#ifdef STORE_CAMERASPACE_Z
fragmentOutputs.color=vec4(id,fragmentInputs.vViewPosZ,0.0,1.0);
#else
fragmentOutputs.color=vec4(id,fragmentInputs.vDepthMetric,0.0,1.0);
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!e.ShadersStoreWGSL[r])e.ShadersStoreWGSL[r]=t;var a=[i,f];for(let n of a)if(!e.IncludesShadersStoreWGSL[n.name])e.IncludesShadersStoreWGSL[n.name]=n.shader;var l={name:r,shader:t};export{l as selectionPixelShaderWGSL};

//# debugId=9A92887D94B47F4564756E2164756E21
//# sourceMappingURL=selection.fragment-0fdh698s.js.map
