import{i}from"./site-1yf4ncc8.js";var e="lodPixelShader",r=`precision highp float;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform sampler2D textureSampler;uniform float lod;uniform vec2 texSize;uniform int gamma;void main(void)
{ivec2 textureDimensions=textureSize(textureSampler,0);gl_FragColor=texelFetch(textureSampler,ivec2(vUV*vec2(textureDimensions)),int(lod));if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!i.ShadersStore[e])i.ShadersStore[e]=r;var n1={name:e,shader:r};
export{n1};

//# debugId=134356D0582C7BC164756E2164756E21
//# sourceMappingURL=site-zgj2z6bg.js.map
