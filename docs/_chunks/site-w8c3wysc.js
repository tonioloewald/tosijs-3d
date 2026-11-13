import{i}from"./site-1yf4ncc8.js";var e="lodPixelShader",r=`precision highp float;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform sampler2D textureSampler;uniform float lod;uniform vec2 texSize;uniform int gamma;void main(void)
{ivec2 textureDimensions=textureSize(textureSampler,0);gl_FragColor=texelFetch(textureSampler,ivec2(vUV*vec2(textureDimensions)),int(lod));if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!i.ShadersStore[e])i.ShadersStore[e]=r;var l1={name:e,shader:r};
export{l1};

//# debugId=27048C486DC2A92164756E2164756E21
//# sourceMappingURL=site-w8c3wysc.js.map
