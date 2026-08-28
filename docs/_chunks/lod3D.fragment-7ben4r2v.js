import{DD as e}from"./site-53d1aqt6.js";import"./site-0m1fh7vm.js";var r="lod3DPixelShader",o=`precision highp float;precision highp sampler3D;const float GammaEncodePowerApprox=1.0/2.2;varying vec2 vUV;uniform sampler3D textureSampler;uniform float lod;uniform float slice;uniform int gamma;void main(void)
{ivec3 textureCoordinates=ivec3(vUV*vec2(textureSize(textureSampler,0).xy),int(slice));gl_FragColor=texelFetch(textureSampler,textureCoordinates,int(lod));if (gamma==0) {gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(GammaEncodePowerApprox));}}
`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var a={name:r,shader:o};export{a as lod3DPixelShader};

//# debugId=750B50B5BAE4325D64756E2164756E21
//# sourceMappingURL=lod3D.fragment-7ben4r2v.js.map
