import{vk as w}from"./site-n6anwf5c.js";import{wk as v}from"./site-myyfmyk6.js";import{Wy as q}from"./site-58j2ewnw.js";import{_B as f}from"./site-7jxv124x.js";var k="screenSpaceReflection2BlurCombinerPixelShader",x=`uniform sampler2D textureSampler; 
uniform sampler2D mainSampler;uniform sampler2D reflectivitySampler;uniform float strength;uniform float reflectionSpecularFalloffExponent;uniform float reflectivityThreshold;varying vec2 vUV;
#include<helperFunctions>
#ifdef SSR_BLEND_WITH_FRESNEL
#include<pbrBRDFFunctions>
#include<screenSpaceRayTrace>
uniform mat4 projection;uniform mat4 invProjectionMatrix;
#ifdef SSR_NORMAL_IS_IN_WORLDSPACE
uniform mat4 view;
#endif
uniform sampler2D normalSampler;uniform sampler2D depthSampler;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
uniform float nearPlaneZ;uniform float farPlaneZ;
#endif
#endif
void main()
{
#ifdef SSRAYTRACE_DEBUG
gl_FragColor=texture2D(textureSampler,vUV);
#else
vec3 SSR=texture2D(textureSampler,vUV).rgb;vec4 color=texture2D(mainSampler,vUV);vec4 reflectivity=texture2D(reflectivitySampler,vUV);
#ifndef SSR_DISABLE_REFLECTIVITY_TEST
if (max(reflectivity.r,max(reflectivity.g,reflectivity.b))<=reflectivityThreshold) {gl_FragColor=color;return;}
#endif
#ifdef SSR_INPUT_IS_GAMMA_SPACE
color=toLinearSpace(color);
#endif
#ifdef SSR_BLEND_WITH_FRESNEL
vec2 texSize=vec2(textureSize(depthSampler,0));vec3 csNormal=texelFetch(normalSampler,ivec2(vUV*texSize),0).xyz;
#ifdef SSR_DECODE_NORMAL
csNormal=csNormal*2.0-1.0;
#endif
#ifdef SSR_NORMAL_IS_IN_WORLDSPACE
csNormal=(view*vec4(csNormal,0.0)).xyz;
#endif
float depth=texelFetch(depthSampler,ivec2(vUV*texSize),0).r;
#ifdef SSRAYTRACE_SCREENSPACE_DEPTH
depth=linearizeDepth(depth,nearPlaneZ,farPlaneZ);
#endif
vec3 csPosition=computeViewPosFromUVDepth(vUV,depth,projection,invProjectionMatrix);vec3 csViewDirection=normalize(csPosition);vec3 F0=reflectivity.rgb;vec3 fresnel=fresnelSchlickGGX(max(dot(csNormal,-csViewDirection),0.0),F0,vec3(1.));vec3 reflectionMultiplier=clamp(pow(fresnel*strength,vec3(reflectionSpecularFalloffExponent)),0.0,1.0);
#else
vec3 reflectionMultiplier=clamp(pow(reflectivity.rgb*strength,vec3(reflectionSpecularFalloffExponent)),0.0,1.0);
#endif
vec3 colorMultiplier=1.0-reflectionMultiplier;vec3 finalColor=(color.rgb*colorMultiplier)+(SSR*reflectionMultiplier);
#ifdef SSR_OUTPUT_IS_GAMMA_SPACE
finalColor=toGammaSpace(finalColor);
#endif
gl_FragColor=vec4(finalColor,color.a);
#endif
}
`;if(!f.ShadersStore[k])f.ShadersStore[k]=x;var z=[q,v,w];for(let g of z)if(!f.IncludesShadersStore[g.name])f.IncludesShadersStore[g.name]=g.shader;var H={name:k,shader:x};
export{H as hk};

//# debugId=94CAAD077DA673C464756E2164756E21
//# sourceMappingURL=site-988nsc0p.js.map
