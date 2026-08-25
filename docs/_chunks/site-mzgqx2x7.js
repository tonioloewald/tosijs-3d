import{_B as e}from"./site-ea0e8ybd.js";var r="sharpenPixelShader",t=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec2 screenSize;uniform vec2 sharpnessAmounts;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec2 onePixel=vec2(1.0,1.0)/screenSize;vec4 color=texture2D(textureSampler,vUV);vec4 edgeDetection=texture2D(textureSampler,vUV+onePixel*vec2(0,-1)) +
texture2D(textureSampler,vUV+onePixel*vec2(-1,0)) +
texture2D(textureSampler,vUV+onePixel*vec2(1,0)) +
texture2D(textureSampler,vUV+onePixel*vec2(0,1)) -
color*4.0;gl_FragColor=max(vec4(color.rgb*sharpnessAmounts.y,color.a)-(sharpnessAmounts.x*vec4(edgeDetection.rgb,0)),0.);}`;if(!e.ShadersStore[r])e.ShadersStore[r]=t;var n={name:r,shader:t};
export{n as Ek};

//# debugId=892639912624E66464756E2164756E21
//# sourceMappingURL=site-mzgqx2x7.js.map
