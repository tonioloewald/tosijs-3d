import{lA as r}from"./site-8w53hv8c.js";import{mA as n}from"./site-1nn7frmg.js";import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var i="volumetricLightingRenderVolumePixelShader",o=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
uniform invViewProjection: mat4x4<f32>;uniform lightDir: vec3f; 
uniform outputTextureSize: vec2f;uniform extinctionPhaseG: vec4f;uniform lightPower: vec3f;uniform textureRatio: vec2f;var depthTexture: texture_2d<f32>;varying vWorldPos: vec4f;fn henyeyGreenstein(g: f32,cosTheta: f32)->f32 {let denom=1+g*g-2*g*cosTheta;return 1.0/(4.0*3.14159265)*(1.0-g*g)/(denom*sqrt(max(denom,0.0)));}
fn integrateDirectional(eyeDist: f32,viewDir: vec3f,lightDir: vec3f)->vec3f {let phaseG=uniforms.extinctionPhaseG.w;
#ifdef USE_EXTINCTION
let extinction=uniforms.extinctionPhaseG.xyz;return henyeyGreenstein(phaseG,dot(viewDir,lightDir))*(vec3f(1.0)-exp(-extinction*eyeDist))/extinction;
#else
return vec3f(henyeyGreenstein(phaseG,dot(viewDir,lightDir)))*vec3f(eyeDist);
#endif
}
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let depth=textureLoad(depthTexture,vec2u(fragmentInputs.position.xy*uniforms.textureRatio),0).r;var worldPos=fragmentInputs.vWorldPos;if (fragmentInputs.position.z>depth) {let ndc=vec4f((fragmentInputs.position.xy/uniforms.outputTextureSize)*2.-1.,depth,1.0);worldPos=uniforms.invViewProjection*ndc;worldPos=worldPos/worldPos.w;}
var viewDir=worldPos.xyz-scene.vEyePosition.xyz;let eyeDist=length(viewDir);viewDir=viewDir/eyeDist;let fSign=select(-1.0,1.0,fragmentInputs.frontFacing);let integral=integrateDirectional(eyeDist,-viewDir,uniforms.lightDir);fragmentOutputs.color=vec4f(uniforms.lightPower*integral*fSign,1.0);}
`;if(!e.ShadersStoreWGSL[i])e.ShadersStoreWGSL[i]=o;var s=[n,r];for(let t of s)if(!e.IncludesShadersStoreWGSL[t.name])e.IncludesShadersStoreWGSL[t.name]=t.shader;var u={name:i,shader:o};export{u as volumetricLightingRenderVolumePixelShaderWGSL};

//# debugId=B10C322C42EA780B64756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.fragment-m6amc6hh.js.map
