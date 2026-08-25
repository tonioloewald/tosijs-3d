import{_B as e}from"./site-ea0e8ybd.js";var o="glowMapMergePixelShader",r=`varying vec2 vUV;uniform sampler2D textureSampler;
#ifdef EMISSIVE
uniform sampler2D textureSampler2;
#endif
uniform float offset;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
vec4 baseColor=texture2D(textureSampler,vUV);
#ifdef EMISSIVE
baseColor+=texture2D(textureSampler2,vUV);baseColor*=offset;
#else
baseColor.a=abs(offset-baseColor.a);
#ifdef STROKE
float alpha=smoothstep(.0,.1,baseColor.a);baseColor.a=alpha;baseColor.rgb=baseColor.rgb*alpha;
#endif
#endif
#if LDR
baseColor=clamp(baseColor,0.,1.0);
#endif
gl_FragColor=baseColor;
#define CUSTOM_FRAGMENT_MAIN_END
}`;if(!e.ShadersStore[o])e.ShadersStore[o]=r;var l={name:o,shader:r};
export{l as bl};

//# debugId=647AFC4884D2C7DF64756E2164756E21
//# sourceMappingURL=site-kngn4bnz.js.map
