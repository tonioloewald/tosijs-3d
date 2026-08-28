import{Fz as l}from"./site-4grmvsrj.js";import{DD as e}from"./site-53d1aqt6.js";var r="copyTextureToTexturePixelShader",t=`uniform float conversion;uniform sampler2D textureSampler;uniform float lodLevel;varying vec2 vUV;
#include<helperFunctions>
void main(void) 
{
#ifdef NO_SAMPLER
vec4 color=texelFetch(textureSampler,ivec2(gl_FragCoord.xy),0);
#else
vec4 color=textureLod(textureSampler,vUV,lodLevel);
#endif
#ifdef DEPTH_TEXTURE
gl_FragDepth=color.r;
#else
if (conversion==1.) {color=toLinearSpace(color);} else if (conversion==2.) {color=toGammaSpace(color);}
gl_FragColor=color;
#endif
}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=t;var c=[l];for(let o of c)if(!e.IncludesShadersStore[o.name])e.IncludesShadersStore[o.name]=o.shader;var a={name:r,shader:t};
export{a as sl};

//# debugId=E71233D5A26D7DFF64756E2164756E21
//# sourceMappingURL=site-sf0qa0dj.js.map
