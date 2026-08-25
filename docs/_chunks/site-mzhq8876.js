import{_B as e}from"./site-ea0e8ybd.js";var c="circleOfConfusionPixelShader",a=`uniform sampler2D depthSampler;varying vec2 vUV;
#ifndef COC_DEPTH_NOT_NORMALIZED
uniform vec2 cameraMinMaxZ;
#endif
uniform float focusDistance;uniform float cocPrecalculation;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{float depth=texture2D(depthSampler,vUV).r;
#define CUSTOM_COC_DEPTH
#ifdef COC_DEPTH_NOT_NORMALIZED
float pixelDistance=depth*1000.0;
#else
float pixelDistance=(cameraMinMaxZ.x+cameraMinMaxZ.y*depth)*1000.0; 
#endif
#define CUSTOM_COC_PIXELDISTANCE
float coc=abs(cocPrecalculation*((focusDistance-pixelDistance)/pixelDistance));coc=clamp(coc,0.0,1.0);gl_FragColor=vec4(coc,coc,coc,1.0);}
`;if(!e.ShadersStore[c])e.ShadersStore[c]=a;var i={name:c,shader:a};
export{i as Qk};

//# debugId=83299D24BF26649E64756E2164756E21
//# sourceMappingURL=site-mzhq8876.js.map
