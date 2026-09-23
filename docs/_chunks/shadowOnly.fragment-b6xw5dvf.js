import{wy as s}from"./site-xfj3qjtt.js";import{yy as d}from"./site-887fz7ny.js";import"./site-9nnd6kgk.js";import{Fy as g}from"./site-pazhmn1a.js";import{Gy as c}from"./site-wtybyp9f.js";import"./site-9x73rt3t.js";import{Mz as u}from"./site-16yw12h5.js";import{Pz as m}from"./site-wra029kb.js";import{Rz as l}from"./site-93bva1mf.js";import{Sz as f}from"./site-qppa82tt.js";import{jA as a}from"./site-13g8e62p.js";import{kA as t}from"./site-trx32srv.js";import{lA as i}from"./site-3rcgnqcg.js";import{mA as r}from"./site-jjyxr8ne.js";import{FD as e}from"./site-vrsvvb55.js";import"./site-jvs5w6sh.js";var o="shadowOnlyPixelShader",S=`#include<sceneUboDeclaration>
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
`;if(!e.ShadersStoreWGSL[o])e.ShadersStoreWGSL[o]=S;var h=[l,m,c,s,g,r,f,a,i,d,u,t];for(let n of h)if(!e.IncludesShadersStoreWGSL[n.name])e.IncludesShadersStoreWGSL[n.name]=n.shader;var _={name:o,shader:S};export{_ as shadowOnlyPixelShaderWGSL};

//# debugId=E8A13E32C0F1EF9164756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-b6xw5dvf.js.map
