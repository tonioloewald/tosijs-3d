import{_B as b}from"./site-7jxv124x.js";var f="clusteredLightingFunctions",k=`struct ClusteredLight {vec4 vLightData;vec4 vLightDiffuse;vec4 vLightSpecular;vec4 vLightDirection;vec4 vLightFalloff;};
#define inline
ClusteredLight getClusteredLight(sampler2D lightDataTexture,int index) {return ClusteredLight(
texelFetch(lightDataTexture,ivec2(0,index),0),
texelFetch(lightDataTexture,ivec2(1,index),0),
texelFetch(lightDataTexture,ivec2(2,index),0),
texelFetch(lightDataTexture,ivec2(3,index),0),
texelFetch(lightDataTexture,ivec2(4,index),0)
);}
int getClusteredSliceIndex(vec2 sliceData,float viewDepth) {return int(log(viewDepth)*sliceData.x+sliceData.y);}
`;if(!b.IncludesShadersStore[f])b.IncludesShadersStore[f]=k;var v={name:f,shader:k};
export{v as ty};

//# debugId=23DAB5AEFB3320A564756E2164756E21
//# sourceMappingURL=site-p7tb0fk3.js.map
