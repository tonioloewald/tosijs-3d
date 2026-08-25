import{_B as e}from"./site-ea0e8ybd.js";var r="lodPixelShader",o=`precision highp float;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform sampler2D textureSampler;uniform float lod;uniform vec2 texSize;uniform int gamma;void main(void)
{ivec2 textureDimensions=textureSize(textureSampler,0);gl_FragColor=texelFetch(textureSampler,ivec2(vUV*vec2(textureDimensions)),int(lod));if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var a={name:r,shader:o};
export{a as oA};

//# debugId=0B5ED3BE281E965E64756E2164756E21
//# sourceMappingURL=site-prz97x1j.js.map
