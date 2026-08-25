import{_B as r}from"./site-ea0e8ybd.js";var e="fluidRenderingStandardBlurPixelShader",o=`uniform sampler2D textureSampler;uniform int filterSize;uniform vec2 blurDir;varying vec2 vUV;void main(void) {vec4 s=textureLod(textureSampler,vUV,0.);if (s.r==0.) {glFragColor=vec4(0.,0.,0.,1.);return;}
float sigma=float(filterSize)/3.0;float twoSigma2=2.0*sigma*sigma;vec4 sum=vec4(0.);float wsum=0.;for (int x=-filterSize; x<=filterSize; ++x) {vec2 coords=vec2(x);vec4 sampl=textureLod(textureSampler,vUV+coords*blurDir,0.);float w=exp(-coords.x*coords.x/twoSigma2);sum+=sampl*w;wsum+=w;}
sum/=wsum;glFragColor=vec4(sum.rgb,1.);}
`;if(!r.ShadersStore[e])r.ShadersStore[e]=o;var i={name:e,shader:o};
export{i as yg};

//# debugId=B473E06BC7CF55DB64756E2164756E21
//# sourceMappingURL=site-3kemtg78.js.map
