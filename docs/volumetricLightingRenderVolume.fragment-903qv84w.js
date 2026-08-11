import{$j as v}from"./site-ahc9286m.js";import{Yy as q}from"./site-ggwxysr4.js";import{_B as f}from"./site-7jxv124x.js";import"./site-68gwymhw.js";var p="volumetricLightingRenderVolumePixelShader",w=`#include<__decl__sceneFragment>
uniform mat4 invViewProjection;uniform vec3 lightDir; 
uniform vec2 outputTextureSize;uniform vec4 extinctionPhaseG;uniform vec3 lightPower;uniform vec2 textureRatio;uniform sampler2D depthTexture;varying vec4 vWorldPos;float henyeyGreenstein(float g,float cosTheta) {float denom=1.0+g*g-2.0*g*cosTheta;return 1.0/(4.0*3.14159265)*(1.0-g*g)/(denom*sqrt(max(denom,0.0)));}
vec3 integrateDirectional(float eyeDist,vec3 viewDir,vec3 lightDir) {float phaseG=extinctionPhaseG.w;
#ifdef USE_EXTINCTION
vec3 extinction=extinctionPhaseG.xyz;return henyeyGreenstein(phaseG,dot(viewDir,lightDir))*(vec3(1.0)-exp(-extinction*eyeDist))/extinction;
#else
return vec3(henyeyGreenstein(phaseG,dot(viewDir,lightDir)))*vec3(eyeDist);
#endif
}
void main(void) {float depth=texelFetch(depthTexture,ivec2(gl_FragCoord.xy*textureRatio),0).r;vec4 worldPos=vWorldPos;if (gl_FragCoord.z>depth) {vec4 ndc=vec4((gl_FragCoord.xy/outputTextureSize)*2.0-1.0,depth*2.0-1.0,1.0);worldPos=invViewProjection*ndc;worldPos=worldPos/worldPos.w;}
vec3 viewDir=worldPos.xyz-vEyePosition.xyz;float eyeDist=length(viewDir);viewDir=viewDir/eyeDist;float fSign=gl_FrontFacing ? 1.0 : -1.0;vec3 integral=integrateDirectional(eyeDist,-viewDir,lightDir);gl_FragColor=vec4(lightPower*integral*fSign,1.0);}
`;if(!f.ShadersStore[p])f.ShadersStore[p]=w;var x=[v,q];for(let k of x)if(!f.IncludesShadersStore[k.name])f.IncludesShadersStore[k.name]=k.shader;var B={name:p,shader:w};export{B as volumetricLightingRenderVolumePixelShader};

//# debugId=0C0BCF430CC950B164756E2164756E21
//# sourceMappingURL=volumetricLightingRenderVolume.fragment-903qv84w.js.map
