import{uy as s}from"./site-7cj3v9zr.js";import{wy as d}from"./site-ky2h5skg.js";import"./site-m8r24xkf.js";import{Dy as g}from"./site-rrktqvx7.js";import{Ey as c}from"./site-3ncekbhz.js";import"./site-tqvce48x.js";import{Kz as u}from"./site-7yz9j1tz.js";import{Nz as m}from"./site-apq8y78s.js";import{Pz as l}from"./site-5mpt0yyf.js";import{Qz as f}from"./site-sskzjsez.js";import{hA as a}from"./site-ccnx75p9.js";import{iA as t}from"./site-jb4tcghj.js";import{jA as i}from"./site-dqtvr7cx.js";import{kA as r}from"./site-cmgd7mz2.js";import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var o="shadowOnlyPixelShader",S=`#include<sceneUboDeclaration>
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

//# debugId=235DE767B0552CE964756E2164756E21
//# sourceMappingURL=shadowOnly.fragment-em3p2ppr.js.map
