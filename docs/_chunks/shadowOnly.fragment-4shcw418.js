import{At}from"./site-zc8fndkr.js";import{se}from"./site-dfwrtqtn.js";import{ii,ri}from"./site-fvmmt67p.js";import{Fi}from"./site-kxcwdk3d.js";import{Te,Ce}from"./site-5red3kgf.js";import{Y}from"./site-7zyg1thv.js";import{st,Ke}from"./site-k22r8w0h.js";import{mi}from"./site-em73594x.js";import{Qe}from"./site-me8s7je1.js";import{i}from"./site-1yf4ncc8.js";var n="shadowOnlyPixelShader",o=`#include<sceneUboDeclaration>
uniform alpha: f32;uniform shadowColor: vec3f;varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#include<helperFunctions>
#include<lightUboDeclaration>[0..maxSimultaneousLights]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(scene.vEyePosition.xyz-fragmentInputs.vPositionW);
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#include<lightFragment>[0..1]
var color: vec4f= vec4f(uniforms.shadowColor,(1.0-clamp(shadow,0.,1.))*uniforms.alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#define CUSTOM_FRAGMENT_MAIN_END
}
`;if(!i.ShadersStoreWGSL[n])i.ShadersStoreWGSL[n]=o;var r=[At,se,ii,Fi,ri,Te,Y,st,Ce,mi,Qe,Ke];for(let e of r)if(!i.IncludesShadersStoreWGSL[e.name])i.IncludesShadersStoreWGSL[e.name]=e.shader;var v={name:n,shader:o};export{v as shadowOnlyPixelShaderWGSL};

//# debugId=DAE4B8A460B2415B64756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-4shcw418.js.map
