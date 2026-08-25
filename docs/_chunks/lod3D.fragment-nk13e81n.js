import{_B as e}from"./site-ea0e8ybd.js";import"./site-j4xgtd48.js";var r="lod3DPixelShader",o=`precision highp float;precision highp sampler3D;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform sampler3D textureSampler;uniform float lod;uniform float slice;uniform int gamma;void main(void)
{ivec3 textureCoordinates=ivec3(vUV*vec2(textureSize(textureSampler,0).xy),int(slice));gl_FragColor=texelFetch(textureSampler,textureCoordinates,int(lod));if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var a={name:r,shader:o};export{a as lod3DPixelShader};

//# debugId=21DA109BBDDC849564756E2164756E21
//# sourceMappingURL=lod3D.fragment-nk13e81n.js.map
