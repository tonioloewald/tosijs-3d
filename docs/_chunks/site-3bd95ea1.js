import{Wy as k}from"./site-2ywb8x5w.js";import{_B as b}from"./site-1q3afg48.js";var g="layerPixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec4 color;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
vec4 baseColor=texture2D(textureSampler,vUV);
#if defined(CONVERT_TO_GAMMA)
baseColor.rgb=toGammaSpace(baseColor.rgb);
#elif defined(CONVERT_TO_LINEAR)
baseColor.rgb=toLinearSpace(baseColor.rgb);
#endif
#ifdef ALPHATEST
if (baseColor.a<0.4)
discard;
#endif
gl_FragColor=baseColor*color;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};
export{y as ai};

//# debugId=7BE0890D3A1B57CD64756E2164756E21
//# sourceMappingURL=site-3bd95ea1.js.map
