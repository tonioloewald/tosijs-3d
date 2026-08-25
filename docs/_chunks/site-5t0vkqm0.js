import{Wy as i}from"./site-stjjqyz5.js";import{_B as e}from"./site-ea0e8ybd.js";var r="iblScaledLuminancePixelShader",n=`precision highp sampler2D;precision highp samplerCube;
#include<helperFunctions>
varying vec2 vUV;
#ifdef IBL_USE_CUBE_MAP
uniform samplerCube iblSource;
#else
uniform sampler2D iblSource;
#endif
uniform int iblWidth;uniform int iblHeight;float fetchLuminance(vec2 coords) {
#ifdef IBL_USE_CUBE_MAP
vec3 direction=equirectangularToCubemapDirection(coords);vec3 color=textureCubeLodEXT(iblSource,direction,0.0).rgb;
#else
vec3 color=textureLod(iblSource,coords,0.0).rgb;
#endif
return dot(color,LuminanceEncodeApprox);}
void main(void) {float deform=sin(vUV.y*PI);float luminance=fetchLuminance(vUV);gl_FragColor=vec4(vec3(deform*luminance),1.0);}`;if(!e.ShadersStore[r])e.ShadersStore[r]=n;var c=[i];for(let o of c)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var t={name:r,shader:n};
export{t as si};

//# debugId=2A3C3FD3E1CDE23764756E2164756E21
//# sourceMappingURL=site-5t0vkqm0.js.map
